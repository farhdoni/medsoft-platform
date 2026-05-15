import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { payments, userPaymentMethods } from '@medsoft/db';
import { eq, and } from 'drizzle-orm';
import { verifyClickSign, clickCardCreate, clickCardVerify, clickCardCharge } from '../../lib/click.js';
import { env } from '../../env.js';

export const clickRouter = new Hono();

// ─── Webhook: Prepare ─────────────────────────────────────────────────────────

clickRouter.post('/prepare', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign } = body;

  const ok = verifyClickSign({
    clickTransId: click_trans_id,
    serviceId: service_id,
    merchantTransId: merchant_trans_id,
    amount,
    action,
    signTime: sign_time,
    sign,
  });

  if (!ok) return c.json({ error: -1, error_note: 'Invalid signature' });

  const payment = await db.select().from(payments).where(eq(payments.id, parseInt(merchant_trans_id))).limit(1);
  if (!payment.length) return c.json({ error: -5, error_note: 'Payment not found' });
  if (payment[0].status === 'completed') return c.json({ error: -4, error_note: 'Already paid' });

  await db.update(payments)
    .set({ status: 'processing', providerTransactionId: click_trans_id })
    .where(eq(payments.id, parseInt(merchant_trans_id)));

  return c.json({ click_trans_id, merchant_trans_id, error: 0, error_note: 'Success' });
});

// ─── Webhook: Complete ────────────────────────────────────────────────────────

clickRouter.post('/complete', async (c) => {
  const body = await c.req.json() as Record<string, string>;
  const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign, error: clickError } = body;

  const ok = verifyClickSign({
    clickTransId: click_trans_id,
    serviceId: service_id,
    merchantTransId: merchant_trans_id,
    amount,
    action,
    signTime: sign_time,
    sign,
  });

  if (!ok) return c.json({ error: -1, error_note: 'Invalid signature' });

  if (parseInt(clickError) < 0) {
    await db.update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.id, parseInt(merchant_trans_id)));
    return c.json({ click_trans_id, merchant_trans_id, error: 0, error_note: 'Cancelled' });
  }

  await db.update(payments)
    .set({ status: 'completed', completedAt: new Date(), providerTransactionId: click_trans_id })
    .where(and(eq(payments.id, parseInt(merchant_trans_id)), eq(payments.status, 'processing')));

  return c.json({ click_trans_id, merchant_trans_id, error: 0, error_note: 'Success' });
});

// ─── Card: Create token ───────────────────────────────────────────────────────

clickRouter.post('/card/create', async (c) => {
  const { cardNumber, expiry } = await c.req.json() as { cardNumber: string; expiry: string };
  try {
    const result = await clickCardCreate(cardNumber, expiry);
    return c.json({ cardToken: result.cardToken, phone: result.phone });
  } catch {
    return c.json({ error: 'Card create failed' }, 500);
  }
});

// ─── Card: Verify SMS ─────────────────────────────────────────────────────────

clickRouter.post('/card/verify', async (c) => {
  const { cardToken, smsCode } = await c.req.json() as { cardToken: string; smsCode: string };
  const ok = await clickCardVerify(cardToken, smsCode);
  return c.json({ verified: ok });
});

// ─── Card: Charge ─────────────────────────────────────────────────────────────

clickRouter.post('/card/charge', async (c) => {
  const { cardToken, amount, merchantTransId } = await c.req.json() as {
    cardToken: string; amount: number; merchantTransId: string;
  };
  const result = await clickCardCharge({ cardToken, amount, merchantTransId });
  return c.json(result);
});
