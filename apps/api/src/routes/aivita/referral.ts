import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  aivitaUsers, referrals, subscriptions, subscriptionPlans, notifications,
} from '@medsoft/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const aivitaReferralRouter = new Hono();

const AIVITA_URL = process.env.AIVITA_URL ?? 'https://aivita.uz';
const PREMIUM_SLUG = 'premium';
const REWARD_DAYS = 30;

// ─── Grant reward to both users ───────────────────────────────────────────────

export async function grantReferralReward(referrerId: string, referredId: string) {
  const premiumPlan = await db.select().from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.slug, PREMIUM_SLUG), eq(subscriptionPlans.isActive, true)))
    .limit(1);

  if (!premiumPlan.length) return;
  const plan = premiumPlan[0];
  const rewardEnd = new Date(Date.now() + REWARD_DAYS * 24 * 60 * 60 * 1000);

  for (const userId of [referrerId, referredId]) {
    const activeSub = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (activeSub.length) {
      const current = activeSub[0];
      const currentExpiry = new Date(current.expiresAt);
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + REWARD_DAYS * 24 * 60 * 60 * 1000);
      await db.update(subscriptions)
        .set({ expiresAt: newExpiry })
        .where(eq(subscriptions.id, current.id));
    } else {
      await db.insert(subscriptions).values({
        userId,
        planId: plan.id,
        status: 'active',
        paymentMethodId: null,
        startedAt: new Date(),
        expiresAt: rewardEnd,
        autoRenew: false,
      });
    }

    await db.update(aivitaUsers).set({ plan: 'premium' }).where(eq(aivitaUsers.id, userId));

    await db.insert(notifications).values({
      userId,
      type: 'referral_reward',
      title: '🎁 Бонус за приглашение!',
      body: 'Вы получили 1 месяц Premium бесплатно за приглашение друга.',
      icon: '🎁',
      link: '/settings/referral',
      priority: 'high',
    });
  }
}

// ─── GET /v1/aivita/referral/my ───────────────────────────────────────────────

aivitaReferralRouter.get('/my', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');

  const user = await db.select({
    referralCode: aivitaUsers.referralCode,
  }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);

  if (!user.length) return c.json({ error: 'user_not_found' }, 404);

  const code = user[0].referralCode ?? null;
  const refLink = code ? `${AIVITA_URL}/ref/${code}` : null;

  // Stats: who I invited
  const invited = await db.select({
    id: referrals.id,
    referredId: referrals.referredId,
    status: referrals.status,
    rewardGiven: referrals.rewardGiven,
    createdAt: referrals.createdAt,
  }).from(referrals)
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));

  // Get names of invited friends
  const invitedWithNames = await Promise.all(
    invited.map(async (r) => {
      const friend = await db.select({ name: aivitaUsers.name, email: aivitaUsers.email })
        .from(aivitaUsers).where(eq(aivitaUsers.id, r.referredId)).limit(1);
      return {
        ...r,
        friendName: friend[0]?.name ?? friend[0]?.email?.split('@')[0] ?? 'Пользователь',
      };
    })
  );

  const totalInvited = invited.length;
  const bonusesEarned = invited.filter(r => r.rewardGiven).length;

  return c.json({
    data: {
      referralCode: code,
      referralLink: refLink,
      totalInvited,
      bonusesEarned,
      friends: invitedWithNames,
    },
  });
});

// ─── POST /v1/aivita/referral/apply ──────────────────────────────────────────

aivitaReferralRouter.post('/apply', requireAivitaAuth, async (c) => {
  const userId = c.get('aivitaUserId');
  const { code } = await c.req.json() as { code: string };

  if (!code?.trim()) return c.json({ error: 'code_required' }, 400);

  // Check user doesn't already have a referral
  const existingReferral = await db.select().from(referrals)
    .where(eq(referrals.referredId, userId)).limit(1);
  if (existingReferral.length) {
    return c.json({ error: 'already_referred' }, 409);
  }

  // Check user wasn't already verified too long ago (7-day window)
  const user = await db.select({ createdAt: aivitaUsers.createdAt, emailVerified: aivitaUsers.emailVerified })
    .from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1);
  if (!user.length) return c.json({ error: 'user_not_found' }, 404);

  const verifiedAt = user[0].emailVerified;
  if (!verifiedAt) return c.json({ error: 'email_not_verified' }, 403);
  if (Date.now() - new Date(verifiedAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
    return c.json({ error: 'window_expired' }, 410);
  }

  // Find referrer
  const referrer = await db.select({ id: aivitaUsers.id })
    .from(aivitaUsers).where(eq(aivitaUsers.referralCode, code.toUpperCase())).limit(1);
  if (!referrer.length) return c.json({ error: 'code_not_found' }, 404);
  if (referrer[0].id === userId) return c.json({ error: 'self_referral' }, 400);

  // Create referral record and grant reward immediately (already verified)
  await db.insert(referrals).values({
    referrerId: referrer[0].id,
    referredId: userId,
    code: code.toUpperCase(),
    status: 'completed',
    rewardGiven: true,
  });

  await db.update(aivitaUsers)
    .set({ referredBy: referrer[0].id })
    .where(eq(aivitaUsers.id, userId));

  await grantReferralReward(referrer[0].id, userId);

  return c.json({ data: { success: true, message: 'Бонус начислен!' } });
});
