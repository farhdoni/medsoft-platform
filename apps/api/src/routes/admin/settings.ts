import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { platformSettings } from '@medsoft/db';
import { inArray } from 'drizzle-orm';

// ─── Shared upsert helper ─────────────────────────────────────────────────────

async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, keys));
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value ?? '';
  return result;
}

async function saveSettings(body: Record<string, string>, allowedKeys: string[]): Promise<void> {
  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key)) continue;
    await db.insert(platformSettings)
      .values({ key, value: String(value), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: String(value), updatedAt: new Date() },
      });
  }
}

// ─── General settings ─────────────────────────────────────────────────────────

export const adminGeneralSettingsRouter = new Hono();
adminGeneralSettingsRouter.use('*', requireAuth);

const GENERAL_KEYS = [
  'platform_name',
  'platform_logo_url',
  'support_email',
  'support_phone',
  'maintenance_mode',
  'registration_open',
];

adminGeneralSettingsRouter.get('/', async (c) => {
  const settings = await getSettings(GENERAL_KEYS);
  // Apply defaults
  const defaults: Record<string, string> = {
    platform_name: 'Aivita',
    platform_logo_url: '',
    support_email: 'support@aivita.uz',
    support_phone: '+998 71 200 00 00',
    maintenance_mode: 'false',
    registration_open: 'true',
  };
  return c.json({ settings: { ...defaults, ...settings } });
});

adminGeneralSettingsRouter.put('/', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  await saveSettings(body, GENERAL_KEYS);
  return c.json({ ok: true });
});

// ─── Payment provider settings ────────────────────────────────────────────────

export const adminPaymentSettingsRouter = new Hono();
adminPaymentSettingsRouter.use('*', requireAuth);

const PAYMENT_KEYS = [
  'click_merchant_id', 'click_service_id', 'click_secret_key', 'click_active',
  'payme_merchant_id', 'payme_secret_key', 'payme_active',
  'uzum_merchant_id', 'uzum_secret_key', 'uzum_api_url', 'uzum_active',
  'payments_test_mode',
];

adminPaymentSettingsRouter.get('/', async (c) => {
  const settings = await getSettings(PAYMENT_KEYS);
  const defaults: Record<string, string> = {
    click_active: 'false',
    payme_active: 'false',
    uzum_active: 'false',
    payments_test_mode: 'false',
    uzum_api_url: 'https://apay.uzum.uz',
  };
  return c.json({ settings: { ...defaults, ...settings } });
});

adminPaymentSettingsRouter.put('/', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  await saveSettings(body, PAYMENT_KEYS);
  return c.json({ ok: true });
});

// ─── SMS settings ─────────────────────────────────────────────────────────────

export const adminSmsSettingsRouter = new Hono();
adminSmsSettingsRouter.use('*', requireAuth);

const SMS_KEYS = ['sms_provider', 'sms_eskiz_token', 'sms_test_mode'];

adminSmsSettingsRouter.get('/', async (c) => {
  const settings = await getSettings(SMS_KEYS);
  const defaults: Record<string, string> = {
    sms_provider: 'eskiz',
    sms_test_mode: 'false',
  };
  return c.json({ settings: { ...defaults, ...settings } });
});

adminSmsSettingsRouter.put('/', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  await saveSettings(body, SMS_KEYS);
  return c.json({ ok: true });
});

adminSmsSettingsRouter.post('/test', requireAuth, async (c) => {
  const { phone, text } = await c.req.json() as { phone: string; text: string };
  if (!phone || !text) return c.json({ error: 'phone and text required' }, 400);

  const [testModeRow] = await db.select().from(platformSettings)
    .where(inArray(platformSettings.key, ['sms_test_mode'])).limit(1);
  const isTest = testModeRow?.value === 'true';

  if (isTest) {
    return c.json({ ok: true, mode: 'test', message: `[TEST] SMS to ${phone}: ${text}` });
  }

  // Real Eskiz send
  const [tokenRow] = await db.select().from(platformSettings)
    .where(inArray(platformSettings.key, ['sms_eskiz_token'])).limit(1);
  const token = tokenRow?.value;
  if (!token) return c.json({ error: 'Eskiz token not configured' }, 400);

  try {
    const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mobile_phone: phone.replace(/\D/g, ''), message: text, from: '4546' }),
    });
    const data = await res.json() as { status?: string };
    return c.json({ ok: data.status === 'waiting', data });
  } catch (err) {
    return c.json({ error: 'SMS send failed', details: String(err) }, 500);
  }
});

// ─── Email settings ───────────────────────────────────────────────────────────

export const adminEmailSettingsRouter = new Hono();
adminEmailSettingsRouter.use('*', requireAuth);

const EMAIL_KEYS = [
  'email_provider', 'smtp_host', 'smtp_port', 'smtp_user',
  'smtp_password', 'smtp_from', 'email_test_mode',
];

adminEmailSettingsRouter.get('/', async (c) => {
  const settings = await getSettings(EMAIL_KEYS);
  const defaults: Record<string, string> = {
    email_provider: 'mock',
    smtp_port: '587',
    email_test_mode: 'true',
  };
  return c.json({ settings: { ...defaults, ...settings } });
});

adminEmailSettingsRouter.put('/', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  await saveSettings(body, EMAIL_KEYS);
  return c.json({ ok: true });
});

adminEmailSettingsRouter.post('/test', requireAuth, async (c) => {
  const { to, subject, text } = await c.req.json() as { to: string; subject: string; text: string };
  if (!to) return c.json({ error: 'to is required' }, 400);

  const [testRow] = await db.select().from(platformSettings)
    .where(inArray(platformSettings.key, ['email_test_mode'])).limit(1);
  const isTest = testRow?.value !== 'false';

  if (isTest) {
    return c.json({ ok: true, mode: 'test', message: `[TEST] Email to ${to}: ${subject}` });
  }

  return c.json({ ok: false, error: 'Real email sending not configured in this version' }, 501);
});
