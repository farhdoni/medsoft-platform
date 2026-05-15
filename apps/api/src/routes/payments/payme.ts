import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { payments } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { verifyPaymeAuth, paymeCardCreate, paymeCardVerify, paymeCardCharge } from '../../lib/payme.js';

export const paymeRouter = new Hono();

// ─── JSON-RPC endpoint ────────────────────────────────────────────────────────

paymeRouter.post('/', async (c) => {
  const auth = c.req.header('Authorization') ?? null;
  if (!verifyPaymeAuth(auth)) {
    return c.json({ error: { code: -32504, message: 'Insufficient privilege' }, id: null });
  }

  const body = await c.req.json() as { method: string; params: Record<string, unknown>; id: number };
  const { method, params, id } = body;

  const orderId = parseInt(String(params.account?.order_id ?? params.id));

  if (method === 'CheckPerformTransaction') {
    const payment = await db.select().from(payments).where(eq(payments.id, orderId)).limit(1);
    if (!payment.length) return c.json({ error: { code: -31050, message: 'Order not found' }, id });
    if (payment[0].status === 'completed') return c.json({ error: { code: -31060, message: 'Already paid' }, id });
    return c.json({ result: { allow: true }, id });
  }

  if (method === 'CreateTransaction') {
    const txId = String(params.id);
    const payment = await db.select().from(payments).where(eq(payments.id, orderId)).limit(1);
    if (!payment.length) return c.json({ error: { code: -31050, message: 'Order not found' }, id });
    await db.update(payments)
      .set({ status: 'processing', providerTransactionId: txId })
      .where(eq(payments.id, orderId));
    return c.json({ result: { create_time: Date.now(), transaction: txId, state: 1 }, id });
  }

  if (method === 'PerformTransaction') {
    const txId = String(params.id);
    await db.update(payments)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(payments.providerTransactionId, txId));
    return c.json({ result: { transaction: txId, perform_time: Date.now(), state: 2 }, id });
  }

  if (method === 'CancelTransaction') {
    const txId = String(params.id);
    await db.update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.providerTransactionId, txId));
    return c.json({ result: { transaction: txId, cancel_time: Date.now(), state: -1 }, id });
  }

  if (method === 'CheckTransaction') {
    const txId = String(params.id);
    const payment = await db.select().from(payments).where(eq(payments.providerTransactionId, txId)).limit(1);
    if (!payment.length) return c.json({ error: { code: -31003, message: 'Transaction not found' }, id });
    const stateMap: Record<string, number> = { pending: 1, processing: 1, completed: 2, failed: -1, refunded: -2 };
    return c.json({ result: { create_time: new Date(payment[0].createdAt).getTime(), state: stateMap[payment[0].status] ?? 1, transaction: txId }, id });
  }

  if (method === 'GetStatement') {
    return c.json({ result: { transactions: [] }, id });
  }

  return c.json({ error: { code: -32601, message: 'Method not found' }, id });
});

// ─── Card: Create ─────────────────────────────────────────────────────────────

paymeRouter.post('/card/create', async (c) => {
  const { cardNumber, expiry } = await c.req.json() as { cardNumber: string; expiry: string };
  try {
    const result = await paymeCardCreate(cardNumber, expiry);
    return c.json({ cardToken: result.cardToken, phone: result.phone });
  } catch {
    return c.json({ error: 'Card create failed' }, 500);
  }
});

// ─── Card: Verify ─────────────────────────────────────────────────────────────

paymeRouter.post('/card/verify', async (c) => {
  const { cardToken, code } = await c.req.json() as { cardToken: string; code: string };
  const ok = await paymeCardVerify(cardToken, code);
  return c.json({ verified: ok });
});

// ─── Card: Charge ─────────────────────────────────────────────────────────────

paymeRouter.post('/card/charge', async (c) => {
  const { cardToken, amount, orderId } = await c.req.json() as {
    cardToken: string; amount: number; orderId: string;
  };
  const result = await paymeCardCharge({ cardToken, amount, orderId });
  return c.json(result);
});
