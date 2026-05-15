import crypto from 'crypto';
import { env } from '../env.js';

const MOCK = !env.UZUM_MERCHANT_ID || !env.UZUM_SECRET_KEY;

export function verifyUzumSignature(body: string, signature: string): boolean {
  if (MOCK) return true;
  const expected = crypto
    .createHmac('sha256', env.UZUM_SECRET_KEY ?? '')
    .update(body)
    .digest('hex');
  return expected === signature;
}

export async function uzumCreatePayment(params: {
  amount: number;
  orderId: string;
  description: string;
  returnUrl: string;
}): Promise<{ paymentUrl: string; transactionId: string }> {
  if (MOCK) {
    return {
      paymentUrl: `${env.AIVITA_URL}/settings/subscription?status=success`,
      transactionId: `mock_uzum_${Date.now()}`,
    };
  }
  const res = await fetch(`${env.UZUM_API_URL}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': env.UZUM_MERCHANT_ID ?? '',
      'X-Signature': crypto
        .createHmac('sha256', env.UZUM_SECRET_KEY ?? '')
        .update(JSON.stringify(params))
        .digest('hex'),
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: 'UZS',
      order_id: params.orderId,
      description: params.description,
      return_url: params.returnUrl,
    }),
  });
  const data = await res.json() as { payment_url: string; transaction_id: string };
  return { paymentUrl: data.payment_url, transactionId: data.transaction_id };
}

export async function uzumCardCreate(cardNumber: string, expiry: string): Promise<{ cardToken: string; phone?: string }> {
  if (MOCK) {
    return { cardToken: `mock_uzum_${Date.now()}`, phone: '+998**9001234' };
  }
  const res = await fetch(`${env.UZUM_API_URL}/card/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': env.UZUM_MERCHANT_ID ?? '',
    },
    body: JSON.stringify({ card_number: cardNumber, expire_date: expiry }),
  });
  const data = await res.json() as { card_token: string; phone: string };
  return { cardToken: data.card_token, phone: data.phone };
}

export async function uzumCardVerify(cardToken: string, code: string): Promise<boolean> {
  if (MOCK) return true;
  const res = await fetch(`${env.UZUM_API_URL}/card/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': env.UZUM_MERCHANT_ID ?? '',
    },
    body: JSON.stringify({ card_token: cardToken, code }),
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

export async function uzumCardCharge(params: {
  cardToken: string;
  amount: number;
  orderId: string;
}): Promise<{ success: boolean; transactionId?: string }> {
  if (MOCK) {
    return { success: true, transactionId: `mock_uzum_tx_${Date.now()}` };
  }
  const res = await fetch(`${env.UZUM_API_URL}/card/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': env.UZUM_MERCHANT_ID ?? '',
    },
    body: JSON.stringify({
      card_token: params.cardToken,
      amount: params.amount,
      order_id: params.orderId,
    }),
  });
  const data = await res.json() as { success: boolean; transaction_id: string };
  return { success: data.success === true, transactionId: data.transaction_id };
}
