import cron from 'node-cron';
import { db } from '@medsoft/db';
import { platformSettings, systemBackups } from '@medsoft/db';
import { inArray, desc, eq } from 'drizzle-orm';
import { createPlatformBackup, BACKUPS_DIR, logSystem } from '../routes/admin/system.js';
import { logger } from '../lib/logger.js';
import fs from 'fs';
import path from 'path';

/** Maximum number of platform backups to retain */
const DEFAULT_RETENTION_COUNT = 20;

async function pruneOldPlatformBackups(keepCount = DEFAULT_RETENTION_COUNT) {
  try {
    const allBackups = await db.select().from(systemBackups).orderBy(desc(systemBackups.createdAt));
    if (allBackups.length > keepCount) {
      const toDelete = allBackups.slice(keepCount);
      for (const b of toDelete) {
        const filepath = path.join(BACKUPS_DIR, b.filename);
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch {}
        }
        await db.delete(systemBackups).where(eq(systemBackups.id, b.id));
      }
      logger.info({ prunedCount: toDelete.length }, '[Backup Cron] Pruned old platform backups');
    }
  } catch (err) {
    logger.error({ err }, '[Backup Cron] Error pruning old backups');
  }
}

async function checkAndRunScheduledBackup() {
  try {
    const rows = await db.select().from(platformSettings)
      .where(inArray(platformSettings.key, ['auto_backup_enabled', 'auto_backup_schedule', 'auto_backup_time']));
    
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value ?? '';

    if (settings['auto_backup_enabled'] !== 'true') {
      return;
    }

    const scheduledTime = settings['auto_backup_time'] || '03:00';
    const scheduleFreq = settings['auto_backup_schedule'] || 'daily';

    const now = new Date();
    const currentUtcHours = now.getUTCHours();
    const currentUtcMinutes = now.getUTCMinutes();
    const currentDayOfWeek = now.getUTCDay(); // 0 = Sunday

    const [targetHour, targetMin] = scheduledTime.split(':').map(Number);

    // Check if current hour/minute matches schedule within standard hourly window
    const hourMatches = currentUtcHours === targetHour;
    const isMinuteNear = Math.abs(currentUtcMinutes - (targetMin || 0)) <= 3;

    if (!hourMatches || !isMinuteNear) {
      return;
    }

    if (scheduleFreq === 'weekly' && currentDayOfWeek !== 0) {
      return;
    }

    logger.info('[Backup Cron] Executing scheduled platform database backup...');
    const result = await createPlatformBackup();
    logger.info({ backupId: result.id, filename: result.filename }, '[Backup Cron] Scheduled backup created successfully');

    await pruneOldPlatformBackups(DEFAULT_RETENTION_COUNT);
  } catch (err: any) {
    logger.error({ err }, '[Backup Cron] Scheduled backup execution failed');
    await logSystem('error', 'system', `Scheduled backup failed: ${err?.message}`);
  }
}

export function startBackupScheduler() {
  // Check schedule every 5 minutes
  cron.schedule('*/5 * * * *', checkAndRunScheduledBackup);
  logger.info('[Cron] Automated backup scheduler job initialized.');
}
