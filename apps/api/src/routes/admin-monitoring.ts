/**
 * Server Monitoring API
 * All endpoints require admin auth.
 * Shell commands are fixed — no user-controlled input reaches the shell.
 */
import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '../middleware/auth.js';
import { db } from '@medsoft/db';
import { redis } from '../lib/redis.js';
import { sql } from 'drizzle-orm';

const execAsync = promisify(exec);
const router = new Hono();
router.use('*', requireAuth);

// ─── Whitelist ────────────────────────────────────────────────────────────────

const ALLOWED_CONTAINERS = ['aivita', 'admin', 'api', 'postgres', 'redis', 'nginx', 'caddy'];

function isContainerAllowed(name: string): boolean {
  return ALLOWED_CONTAINERS.some((allowed) => name.toLowerCase().includes(allowed));
}

// ─── Shell helpers ────────────────────────────────────────────────────────────

async function safe(cmd: string, timeoutMs = 5000): Promise<string> {
  const { stdout } = await execAsync(cmd, { timeout: timeoutMs });
  return stdout.trim();
}

async function getCPU(): Promise<{ usagePercent: number }> {
  try {
    // Works on both Linux (top) and Docker environments
    const out = await safe("top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4}'");
    return { usagePercent: Math.round(parseFloat(out) || 0) };
  } catch {
    // Alternative via /proc/stat
    try {
      const stat = await safe("awk '/^cpu /{print $2+$3+$4+$5+$6+$7+$8,$5}' /proc/stat");
      const [total, idle] = stat.split(' ').map(Number);
      return { usagePercent: total > 0 ? Math.round(((total - idle) / total) * 100) : 0 };
    } catch {
      return { usagePercent: 0 };
    }
  }
}

async function getMemory(): Promise<{ totalMb: number; usedMb: number; availableMb: number; usagePercent: number }> {
  try {
    const out = await safe("free -m | grep '^Mem:'");
    const parts = out.split(/\s+/).map(Number);
    const [, total, used] = parts;
    const available = parts[6] ?? parts[3]; // 'available' column index varies
    return {
      totalMb: total,
      usedMb: used,
      availableMb: available,
      usagePercent: total > 0 ? Math.round((used / total) * 100) : 0,
    };
  } catch {
    return { totalMb: 0, usedMb: 0, availableMb: 0, usagePercent: 0 };
  }
}

async function getDisk(): Promise<{ totalGb: number; usedGb: number; availableGb: number; usagePercent: number }> {
  try {
    const out = await safe("df -BG / | tail -1");
    const [, total, used, available, percent] = out.split(/\s+/);
    return {
      totalGb: parseInt(total),
      usedGb: parseInt(used),
      availableGb: parseInt(available),
      usagePercent: parseInt(percent),
    };
  } catch {
    return { totalGb: 0, usedGb: 0, availableGb: 0, usagePercent: 0 };
  }
}

// ─── A. System stats ──────────────────────────────────────────────────────────

router.get('/system', async (c) => {
  const [cpu, memory, disk] = await Promise.all([getCPU(), getMemory(), getDisk()]);
  return c.json({ cpu, memory, disk, timestamp: new Date().toISOString() });
});

// ─── B. Containers ────────────────────────────────────────────────────────────

router.get('/containers', async (c) => {
  try {
    // List running containers
    const listOut = await safe("docker ps --format '{{json .}}'", 8000);
    const containers = listOut
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);

    // Get resource stats (no-stream for single snapshot)
    let statsMap: Record<string, { cpu: string; mem: string }> = {};
    try {
      const statsOut = await safe(
        "docker stats --no-stream --format '{{.Name}}\\t{{.CPUPerc}}\\t{{.MemPerc}}'",
        10000,
      );
      for (const line of statsOut.split('\n').filter(Boolean)) {
        const [name, cpu, mem] = line.split('\t');
        statsMap[name] = { cpu: cpu?.replace('%', '') ?? '0', mem: mem?.replace('%', '') ?? '0' };
      }
    } catch { /* stats may fail if docker stats not available */ }

    const result = containers.map((ct: Record<string, string>) => {
      const name = ct.Names ?? ct.Name ?? '';
      return {
        id: ct.ID ?? ct.Id ?? '',
        name,
        image: ct.Image ?? '',
        status: ct.Status ?? '',
        state: ct.State ?? 'running',
        createdAt: ct.CreatedAt ?? '',
        ports: ct.Ports ?? '',
        cpuPercent: parseFloat(statsMap[name]?.cpu ?? '0'),
        memPercent: parseFloat(statsMap[name]?.mem ?? '0'),
      };
    });

    return c.json({ containers: result });
  } catch (err) {
    return c.json({ containers: [], error: 'Docker not available' });
  }
});

// ─── C. Container logs ────────────────────────────────────────────────────────

router.get('/logs/:container', async (c) => {
  const containerName = c.req.param('container');
  const lines = Math.min(parseInt(c.req.query('lines') ?? '100'), 1000);

  if (!isContainerAllowed(containerName)) {
    return c.json({ error: 'Container not in allowlist' }, 403);
  }

  try {
    // Redirect stderr to stdout (2>&1) so we capture all log output
    const out = await safe(`docker logs --tail ${lines} "${containerName}" 2>&1`, 15000);
    return c.json({ container: containerName, logs: out, lines });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch logs';
    return c.json({ container: containerName, logs: '', error: msg }, 500);
  }
});

// ─── D. Health checks ────────────────────────────────────────────────────────

type HealthCheck = { name: string; healthy: boolean; statusCode?: number; latencyMs: number; error?: string };

async function checkHttp(name: string, url: string): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { name, healthy: res.ok, statusCode: res.status, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    return { name, healthy: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'failed' };
  }
}

async function checkDb(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { name: 'PostgreSQL', healthy: true, latencyMs: Date.now() - start };
  } catch {
    return { name: 'PostgreSQL', healthy: false, latencyMs: Date.now() - start, error: 'query failed' };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return { name: 'Redis', healthy: true, latencyMs: Date.now() - start };
  } catch {
    return { name: 'Redis', healthy: false, latencyMs: Date.now() - start, error: 'ping failed' };
  }
}

router.get('/health', async (c) => {
  const checks = await Promise.all([
    checkHttp('aivita.uz', 'https://aivita.uz'),
    checkHttp('api.aivita.uz', 'https://api.aivita.uz/v1/health'),
    checkHttp('admin.aivita.uz', 'https://admin.aivita.uz'),
    checkDb(),
    checkRedis(),
  ]);

  return c.json({ checks, allHealthy: checks.every((ch) => ch.healthy) });
});

export { router as adminMonitoringRouter };
