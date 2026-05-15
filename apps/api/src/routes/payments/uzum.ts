import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { payments } from '@medsoft/db';
import { eq } from 'drizzle-orm';
import { verifyUzumSignature, uzumCreatePayment, uzumCardCreate, uzumCardVerify, uzumCardCharge } from '../../lib/uzum.js';

export const uzumRouter = new Hono();

// ─── Create payment (redirect flow) ──────────────────────────────────────────

uzumRouter.post('/create', async (c) => {
  const { amount, orderId, description, returnUrl } = await c.req.json() as {
    amount: number; orderId: string; description: string; returnUrl: string;
  };
  try {
    const result = await uzumCreatePayment({ amount, orderId, description, returnUrl });
    return c.json(result);
  } catch {
    return c.json({ error: 'Uzum payment create failed' }, 500);
  }
});

// ─── Webhook: callback ────────────────────────────────────────────────────────

uzumRouter.post('/callback', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('X-Uzum-Signature') ?? '';

  if (!verifyUzumSignature(rawBody, signature)) {
    return c.json({ error: 'Invalid signature' }, 403);
  }

  const body = JSON.parse(rawBody) as {
    transaction_id: string;
    order_id: string;
    status: string;
    amount: number;
  };

  if (body.status === 'SUCCESS') {
    await db.update(payments)
      .set({ status: 'completed', completedAt: new Date(), providerTransactionId: body.transaction_id })
      .where(eq(payments.id, parseInt(body.order_id)));
  } else {
    await db.update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.id, parseInt(body.order_id)));
  }

  return c.json({ received: true });
});

// ─── Card: Create ─────────────────────────────────────────────────────────────

uzumRouter.post('/card/create', async (c) => {
  const { cardNumber, expiry } = await c.req.json() as { cardNumber: string; expiry: string };
  try {
    const result = await uzumCardCreate(cardNumber, expiry);
    return c.json({ cardToken: result.cardToken, phone: result.phone });
  } catch {
    return c.json({ error: 'Card create failed' }, 500);
  }
});

// ─── Card: Verify ─────────────────────────────────────────────────────────────

uzumRouter.post('/card/verify', async (c) => {
  const { cardToken, code } = await c.req.json() as { cardToken: string; code: string };
  const ok = await uzumCardVerify(cardToken, code);
  return c.json({ verified: ok });
});

// ─── Card: Charge ─────────────────────────────────────────────name────────────

uzumRouter.post('/card/charge', async (c) => {
  const { cardToken, amount, orderId } = await c.req.json() as {
    cardToken: string; amount: number; orderId: string;
  };
  const result = await uzumCardCharge({ cardToken, amount, orderId });
  return c.json(result);
});
