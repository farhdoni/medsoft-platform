import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { consultationInvoices, payments, userPaymentMethods } from '@medsoft/db';
import { eq, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { chargeByToken } from './payments.js';
import { uzumCreatePayment } from '../../lib/uzum.js';
import { getConsultationCommissionPercent } from '../../lib/commission.js';
import { notifyConversationParticipant } from './messaging.js';
import { env } from '../../env.js';

// Paying and cancelling a consultation invoice — the two things that happen
// to an invoice message after a doctor sends it (see
// routes/aivita/messaging.ts POST .../invoice for how it's created).

export const aivitaConsultationsRouter = new Hono();
aivitaConsultationsRouter.use('*', requireAivitaAuth);

/**
 * Transitions the consultation_invoices row tied to a now-completed payment,
 * and notifies the doctor. Shared by two callers: the synchronous charge
 * below (saved card) and the click/payme/uzum webhook handlers (no saved
 * card — payment completes later, via their own /complete-equivalent).
 *
 * Guarded by the same WHERE ... status='pending' idiom as everywhere else in
 * this file, so a webhook retry after the synchronous path already paid the
 * invoice is a no-op rather than a double notification.
 */
export async function markInvoicePaidForPayment(payment: typeof payments.$inferSelect): Promise<void> {
  const meta = payment.metadata as Record<string, unknown> | null;
  const invoiceId = meta && typeof meta.invoiceId === 'string' ? meta.invoiceId : undefined;
  if (!invoiceId) return;

  const [invoice] = await db.select().from(consultationInvoices)
    .where(eq(consultationInvoices.id, invoiceId)).limit(1);
  if (!invoice || invoice.status !== 'pending') return;

  const paidAt = new Date();
  await db.update(consultationInvoices)
    .set({ status: 'paid', paidAt, paymentId: payment.id })
    .where(and(eq(consultationInvoices.id, invoice.id), eq(consultationInvoices.status, 'pending')));

  await notifyConversationParticipant(
    invoice.conversationId,
    invoice.doctorId,
    'Счёт оплачен',
    `Пациент оплатил консультацию: ${invoice.amount.toLocaleString('ru-RU')} сум`,
    { conversationId: invoice.conversationId, invoiceId: invoice.id, type: 'invoice_paid' },
  );
}

// ─── POST /invoices/:id/pay ───────────────────────────────────────────────────
// Patient-only, and only the patient who was actually billed. Mirrors
// POST /v1/aivita/payments/create: charge the caller's saved card
// synchronously via chargeByToken when one exists, otherwise hand back a
// checkout URL the same way subscription checkout does.

aivitaConsultationsRouter.post('/invoices/:id/pay', async (c) => {
  const me = c.get('aivitaUserId');
  const invoiceId = c.req.param('id');
  const body = await c.req.json().catch(() => ({})) as { paymentMethodId?: number; provider?: string };

  const [invoice] = await db.select().from(consultationInvoices)
    .where(eq(consultationInvoices.id, invoiceId)).limit(1);
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);
  if (invoice.patientId !== me) return c.json({ error: 'Forbidden' }, 403);
  if (invoice.status !== 'pending') return c.json({ error: `Invoice is ${invoice.status}` }, 400);

  const methodId = body.paymentMethodId ?? null;
  let method = null;
  if (methodId) {
    const rows = await db.select().from(userPaymentMethods)
      .where(and(eq(userPaymentMethods.id, methodId), eq(userPaymentMethods.userId, me))).limit(1);
    method = rows[0] ?? null;
  } else {
    const rows = await db.select().from(userPaymentMethods)
      .where(and(eq(userPaymentMethods.userId, me), eq(userPaymentMethods.isDefault, true))).limit(1);
    method = rows[0] ?? null;
  }

  // Commission is locked in at payment time, from whatever /finance/settings
  // says right now — a later change to the rate never touches this row.
  const commissionPercent = await getConsultationCommissionPercent();
  const commission = Math.round(invoice.amount * commissionPercent / 100);
  const netAmount = invoice.amount - commission;

  // userId is the DOCTOR, not the payer — the same payout/earnings
  // convention every other consultation-adjacent payments row already uses.
  const [payment] = await db.insert(payments).values({
    userId: invoice.doctorId,
    type: 'consultation',
    amount: invoice.amount,
    commission,
    netAmount,
    currency: 'UZS',
    provider: method?.provider ?? body.provider ?? null,
    paymentMethodId: method?.id ?? null,
    status: method ? 'processing' : 'pending',
    metadata: { invoiceId: invoice.id },
  }).returning();

  if (!method) {
    // No saved card — same "redirect to add a card, webhook completes it"
    // fallback subscription checkout uses. The click/payme webhook handlers
    // read metadata.invoiceId to transition this invoice once that completes.
    const provider = body.provider ?? 'click';
    let checkoutUrl = `${env.AIVITA_URL}/settings/payment-methods?addCard=1&provider=${provider}&paymentId=${payment.id}&invoiceId=${invoice.id}`;

    if (provider === 'uzum') {
      try {
        const uzumResult = await uzumCreatePayment({
          amount: invoice.amount,
          orderId: String(payment.id),
          description: `Консультация — счёт ${invoice.id}`,
          returnUrl: `${env.AIVITA_URL}/messenger/${invoice.conversationId}?status=success`,
        });
        checkoutUrl = uzumResult.paymentUrl;
      } catch {
        // fallback to manual redirect
      }
    }

    return c.json({ data: { payment, checkoutUrl, requiresRedirect: true } });
  }

  const result = await chargeByToken(method.provider, method.cardToken, invoice.amount, String(payment.id));
  if (!result.success) {
    await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));
    return c.json({ error: 'Payment failed', payment }, 402);
  }

  const [completedPayment] = await db.update(payments).set({
    status: 'completed',
    completedAt: new Date(),
    providerTransactionId: result.transactionId ?? null,
  }).where(eq(payments.id, payment.id)).returning();

  await markInvoicePaidForPayment(completedPayment);

  const [paidInvoice] = await db.select().from(consultationInvoices)
    .where(eq(consultationInvoices.id, invoice.id)).limit(1);

  return c.json({
    data: {
      payment: completedPayment,
      invoice: paidInvoice ?? invoice,
    },
  });
});

// ─── POST /invoices/:id/cancel ────────────────────────────────────────────────
// Only the invoice's own doctor-author, only while it's still pending — once
// paid or cancelled there's nothing left to cancel.

aivitaConsultationsRouter.post('/invoices/:id/cancel', async (c) => {
  const me = c.get('aivitaUserId');
  const invoiceId = c.req.param('id');

  const [invoice] = await db.select().from(consultationInvoices)
    .where(eq(consultationInvoices.id, invoiceId)).limit(1);
  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);
  if (invoice.doctorId !== me) return c.json({ error: 'Forbidden' }, 403);
  if (invoice.status !== 'pending') return c.json({ error: `Invoice is ${invoice.status}, cannot cancel` }, 400);

  await db.update(consultationInvoices)
    .set({ status: 'cancelled' })
    .where(and(eq(consultationInvoices.id, invoiceId), eq(consultationInvoices.status, 'pending')));

  return c.json({ data: { id: invoiceId, status: 'cancelled' } });
});
