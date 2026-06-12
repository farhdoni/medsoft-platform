import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { redis } from '../../lib/redis.js';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaDiagRouter = new Hono();

aivitaDiagRouter.use('*', requireAivitaAuth);

const DIAG_TTL = 7 * 24 * 3600; // 7 days
const DIAG_MAX = 50;             // entries per user

const diagKey = (userId: string) => `diag:meds:${userId}`;

// ─── POST / — append a log entry ──────────────────────────────────────────────
aivitaDiagRouter.post(
  '/',
  zValidator('json', z.object({
    tag:     z.string().max(80),
    payload: z.unknown(),
    ts:      z.number().optional(), // client unix-ms timestamp
  })),
  async (c) => {
    const userId = c.get('aivitaUserId');
    const { tag, payload, ts } = c.req.valid('json');
    const entry = JSON.stringify({ ts: ts ?? Date.now(), tag, payload });

    try {
      const key = diagKey(userId);
      await redis.rpush(key, entry);
      await redis.ltrim(key, -DIAG_MAX, -1); // keep last 50
      await redis.expire(key, DIAG_TTL);
    } catch {
      // Redis down — silently discard (non-critical diagnostics)
    }

    return c.json({ ok: true });
  }
);

// ─── GET / — read logs for current user ───────────────────────────────────────
aivitaDiagRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');
  try {
    const raw = await redis.lrange(diagKey(userId), 0, -1);
    const logs = raw.map(r => { try { return JSON.parse(r); } catch { return r; } });
    return c.json({ data: logs });
  } catch {
    return c.json({ data: [] });
  }
});
