import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { payments } from '@medsoft/db';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';
import { verifyPaymeAuth, paymeCardCreate, paymeCardVerify, paymeCardCharge } from '../../lib/payme.js';
import { activateSubscription } from '../aivita/payments.js';

export const paymeRouter = new Hono();

// ─── JSON-RPC endpoint ────────────────────────────────────────────────────────

type PaymeTx = {
  txId: string;
  createTime: number;
  performTime?: number;
  cancelTime?: number;
  reason?: number | null;
  state: number;
};

function getPaymeTx(metadata: unknown): PaymeTx | undefined {
  const m = metadata as Record<string, unknown> | null | undefined;
  return (m?.payme as PaymeTx | undefined) ?? undefined;
}
function withPaymeTx(metadata: unknown, tx: PaymeTx): Record<string, unknown> {
  return { ...((metadata as Record<string, unknown> | null) ?? {}), payme: tx };
}

paymeRouter.post('/', async (c) => {
  const auth = c.req.header('Authorization') ?? null;
  if (!verifyPaymeAuth(auth)) {
    return c.json({ error: { code: -32504, message: 'Insufficient privilege' }, id: null });
  }

  const body = await c.req.json() as { method: string; params: Record<string, unknown>; id: number };
  const { method, params, id } = body;

  const account = params.account as Record<string, unknown> | undefined;
  const orderId = parseInt(String(account?.order_id ?? params.id));

  if (method === 'CheckPerformTransaction') {
    const [payment] = await db.select().from(payments).where(eq(payments.id, orderId)).limit(1);
    if (!payment) return c.json({ error: { code: -31050, message: 'Order not found' }, id });
    if (payment.status === 'completed') return c.json({ error: { code: -31060, message: 'Already paid' }, id });
    if (Number(params.amount) !== payment.amount * 100) {
      return c.json({ error: { code: -31001, message: 'Incorrect amount' }, id });
    }
    return c.json({ result: { allow: true }, id });
  }

  if (method === 'CreateTransaction') {
    const txId = String(params.id);
    const [payment] = await db.select().from(payments).where(eq(payments.id, orderId)).limit(1);
    if (!payment) return c.json({ error: { code: -31050, message: 'Order not found' }, id });
    if (Number(params.amount) !== payment.amount * 100) {
      return c.json({ error: { code: -31001, message: 'Incorrect amount' }, id });
    }

    const existing = getPaymeTx(payment.metadata);
    if (existing) {
      // Idempotent replay of the same transaction.
      if (existing.txId === txId) {
        return c.json({ result: { create_time: existing.createTime, transaction: txId, state: existing.state }, id });
      }
      // A different transaction already exists for this order.
      return c.json({ error: { code: -31050, message: 'Order already has a transaction' }, id });
    }
    if (payment.status === 'completed') {
      return c.json({ error: { code: -31060, message: 'Already paid' }, id });
    }

    const createTime = Date.now();
    const tx: PaymeTx = { txId, createTime, state: 1 };
    await db.update(payments)
      .set({ status: 'processing', provider: 'payme', providerTransactionId: txId, metadata: withPaymeTx(payment.metadata, tx) })
      .where(eq(payments.id, orderId));
    return c.json({ result: { create_time: createTime, transaction: txId, state: 1 }, id });
  }

  if (method === 'PerformTransaction') {
    const txId = String(params.id);
    const [payment] = await db.select().from(payments).where(eq(payments.providerTransactionId, txId)).limit(1);
    if (!payment) return c.json({ error: { code: -31003, message: 'Transaction not found' }, id });
    const tx = getPaymeTx(payment.metadata);

    // Idempotent: already performed → return the original perform_time.
    if (payment.status === 'completed') {
      const performTime = tx?.performTime ?? (payment.completedAt ? new Date(payment.completedAt).getTime() : Date.now());
      return c.json({ result: { transaction: txId, perform_time: performTime, state: 2 }, id });
    }

    const performTime = Date.now();
    await db.update(payments)
      .set({
        status: 'completed',
        completedAt: new Date(),
        metadata: withPaymeTx(payment.metadata, { ...(tx ?? { txId, createTime: performTime }), txId, performTime, state: 2 }),
      })
      .where(eq(payments.id, payment.id));

    // Activate the subscription tied to this payment, if any.
    const meta = payment.metadata as Record<string, unknown> | null;
    const planId = meta && typeof meta.planId === 'number' ? meta.planId : undefined;
    if (payment.type === 'subscription' && planId) {
      try {
        await activateSubscription(payment.userId, planId, payment.paymentMethodId ?? null);
      } catch {
        // Payment stays completed; activation can be retried out of band.
      }
    }

    return c.json({ result: { transaction: txId, perform_time: performTime, state: 2 }, id });
  }

  if (method === 'CancelTransaction') {
    const txId = String(params.id);
    const [payment] = await db.select().from(payments).where(eq(payments.providerTransactionId, txId)).limit(1);
    if (!payment) return c.json({ error: { code: -31003, message: 'Transaction not found' }, id });
    const tx = getPaymeTx(payment.metadata);
    const reason = params.reason != null ? Number(params.reason) : null;

    // Idempotent: already cancelled / refunded.
    if (payment.status === 'failed' || payment.status === 'refunded') {
      return c.json({ result: { transaction: txId, cancel_time: tx?.cancelTime ?? Date.now(), state: tx?.state ?? -1 }, id });
    }

    const wasCompleted = payment.status === 'completed';
    const cancelTime = Date.now();
    const state = wasCompleted ? -2 : -1;
    await db.update(payments)
      .set({
        status: wasCompleted ? 'refunded' : 'failed',
        metadata: withPaymeTx(payment.metadata, { ...(tx ?? { txId, createTime: cancelTime }), txId, cancelTime, reason, state }),
      })
      .where(eq(payments.id, payment.id));
    return c.json({ result: { transaction: txId, cancel_time: cancelTime, state }, id });
  }

  if (method === 'CheckTransaction') {
    const txId = String(params.id);
    const [payment] = await db.select().from(payments).where(eq(payments.providerTransactionId, txId)).limit(1);
    if (!payment) return c.json({ error: { code: -31003, message: 'Transaction not found' }, id });
    const tx = getPaymeTx(payment.metadata);
    const stateMap: Record<string, number> = { pending: 1, processing: 1, completed: 2, failed: -1, refunded: -2 };
    return c.json({
      result: {
        create_time: tx?.createTime ?? new Date(payment.createdAt).getTime(),
        perform_time: tx?.performTime ?? 0,
        cancel_time: tx?.cancelTime ?? 0,
        transaction: txId,
        state: tx?.state ?? stateMap[payment.status] ?? 1,
        reason: tx?.reason ?? null,
      },
      id,
    });
  }

  if (method === 'GetStatement') {
    const from = Number(params.from);
    const to = Number(params.to);
    const rows = await db.select().from(payments)
      .where(and(
        eq(payments.provider, 'payme'),
        isNotNull(payments.providerTransactionId),
        gte(payments.createdAt, new Date(Number.isFinite(from) ? from : 0)),
        lte(payments.createdAt, new Date(Number.isFinite(to) ? to : Date.now())),
      ));
    const transactions = rows.map((p) => {
      const tx = getPaymeTx(p.metadata);
      const createTime = tx?.createTime ?? new Date(p.createdAt).getTime();
      return {
        id: p.providerTransactionId,
        time: createTime,
        amount: p.amount * 100,
        account: { order_id: p.id },
        create_time: createTime,
        perform_time: tx?.performTime ?? 0,
        cancel_time: tx?.cancelTime ?? 0,
        transaction: p.providerTransactionId,
        state: tx?.state ?? 1,
        reason: tx?.reason ?? null,
      };
    });
    return c.json({ result: { transactions }, id });
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
