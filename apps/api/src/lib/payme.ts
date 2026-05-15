import { env } from '../env.js';

const MOCK = !env.PAYME_MERCHANT_ID || !env.PAYME_SECRET_KEY;

export function getPaymeBasicAuth(): string {
  return Buffer.from(`${env.PAYME_MERCHANT_ID}:${env.PAYME_SECRET_KEY}`).toString('base64');
}

export function verifyPaymeAuth(authHeader: string | null): boolean {
  if (MOCK) return true;
  if (!authHeader) return false;
  const expected = `Basic ${getPaymeBasicAuth()}`;
  return authHeader === expected;
}

export async function paymeCardCreate(cardNumber: string, expiry: string): Promise<{ cardToken: string; phone?: string }> {
  if (MOCK) {
    return { cardToken: `mock_payme_${Date.now()}`, phone: '+998**9001234' };
  }
  const res = await fetch('https://checkout.paycom.uz/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth': `${env.PAYME_MERCHANT_ID}:${env.PAYME_SECRET_KEY}`,
    },
    body: JSON.stringify({
      method: 'cards.create',
      params: {
        card: { number: cardNumber, expire: expiry },
        save: true,
      },
    }),
  });
  const data = await res.json() as { result: { card: { token: string; phone: string } } };
  return { cardToken: data.result.card.token, phone: data.result.card.phone };
}

export async function paymeCardVerify(cardToken: string, code: string): Promise<boolean> {
  if (MOCK) return true;
  const res = await fetch('https://checkout.paycom.uz/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth': `${env.PAYME_MERCHANT_ID}:${env.PAYME_SECRET_KEY}`,
    },
    body: JSON.stringify({
      method: 'cards.verify',
      params: { token: cardToken, code },
    }),
  });
  const data = await res.json() as { result: { card: { verify: boolean } } };
  return data.result?.card?.verify === true;
}

export async function paymeCardCharge(params: {
  cardToken: string;
  amount: number;
  orderId: string;
}): Promise<{ success: boolean; transactionId?: string }> {
  if (MOCK) {
    return { success: true, transactionId: `mock_payme_tx_${Date.now()}` };
  }
  const res = await fetch('https://checkout.paycom.uz/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth': `${env.PAYME_MERCHANT_ID}:${env.PAYME_SECRET_KEY}`,
    },
    body: JSON.stringify({
      method: 'receipts.pay',
      params: {
        token: params.cardToken,
        receipt: {
          amount: params.amount * 100,
          account: { order_id: params.orderId },
        },
      },
    }),
  });
  const data = await res.json() as { result: { receipt: { _id: string; state: number } } };
  const ok = data.result?.receipt?.state === 4;
  return { success: ok, transactionId: data.result?.receipt?._id };
}
