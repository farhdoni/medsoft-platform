import crypto from 'crypto';
import { env } from '../env.js';

const MOCK = !env.CLICK_MERCHANT_ID || !env.CLICK_SECRET_KEY;

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyClickSign(params: {
  clickTransId: string;
  serviceId: string;
  merchantTransId: string;
  amount: string;
  action: string;
  signTime: string;
  sign: string;
}): boolean {
  // Never accept the mock bypass in production — fail closed if creds are missing.
  if (MOCK) return env.NODE_ENV !== 'production';
  if (!params.sign) return false;
  const raw = [
    params.clickTransId,
    params.serviceId,
    env.CLICK_SECRET_KEY,
    params.merchantTransId,
    params.amount,
    params.action,
    params.signTime,
  ].join('');
  const expected = crypto.createHash('md5').update(raw).digest('hex');
  return safeEqualHex(expected, params.sign);
}

export async function clickCardCreate(cardNumber: string, expiry: string): Promise<{ cardToken: string; phone?: string }> {
  if (MOCK) {
    return { cardToken: `mock_click_${Date.now()}`, phone: '+998**9001234' };
  }
  const res = await fetch('https://api.click.uz/v2/merchant/card/token/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Auth': `${env.CLICK_MERCHANT_ID}:${env.CLICK_SECRET_KEY}`,
    },
    body: JSON.stringify({
      service_id: env.CLICK_SERVICE_ID,
      card_number: cardNumber,
      expire_date: expiry,
      temporary: 0,
    }),
  });
  const data = await res.json() as { card_token: string; phone: string };
  return { cardToken: data.card_token, phone: data.phone };
}

export async function clickCardVerify(cardToken: string, smsCode: string): Promise<boolean> {
  if (MOCK) return true;
  const res = await fetch('https://api.click.uz/v2/merchant/card/token/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Auth': `${env.CLICK_MERCHANT_ID}:${env.CLICK_SECRET_KEY}`,
    },
    body: JSON.stringify({
      service_id: env.CLICK_SERVICE_ID,
      card_token: cardToken,
      sms_code: smsCode,
    }),
  });
  const data = await res.json() as { error_code: number };
  return data.error_code === 0;
}

export async function clickCardCharge(params: {
  cardToken: string;
  amount: number;
  merchantTransId: string;
}): Promise<{ success: boolean; transactionId?: string }> {
  if (MOCK) {
    return { success: true, transactionId: `mock_click_tx_${Date.now()}` };
  }
  const res = await fetch('https://api.click.uz/v2/merchant/card/token/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Auth': `${env.CLICK_MERCHANT_ID}:${env.CLICK_SECRET_KEY}`,
    },
    body: JSON.stringify({
      service_id: env.CLICK_SERVICE_ID,
      card_token: params.cardToken,
      amount: params.amount,
      transaction_param: params.merchantTransId,
    }),
  });
  const data = await res.json() as { error_code: number; click_trans_id: string };
  return { success: data.error_code === 0, transactionId: String(data.click_trans_id) };
}
