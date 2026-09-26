import { Hono } from 'hono';
import { db } from '@medsoft/db';
import {
  aivitaUsers, chronicConditions, healthScores, labResults,
  conversationParticipants, messages,
} from '@medsoft/db';
import { eq, and, isNull, desc, ne, or, gt, inArray } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import { getOnboardingProgress } from '../../lib/onboarding-progress.js';

export const aivitaHomeStateRouter = new Hono();
aivitaHomeStateRouter.use('*', requireAivitaAuth);

// ─── GET / — everything Home's Soft 3D state selection needs beyond what
// loadHomeData() already fetches (vitals/habits/reports/survey). Each piece
// here reuses an existing table; nothing new is created for this. ──────────

aivitaHomeStateRouter.get('/', async (c) => {
  const userId = c.get('aivitaUserId');

  const [progress, chronicRow, scoreRow, labRow, doctorReply] = await Promise.all([
    getOnboardingProgress(userId),

    // Diagnosis state's weather panel names the condition ("а у вас
    // {condition}") — first one on file, oldest first, when there's more
    // than one. Not a claim about which is most relevant, just a stable pick.
    db.select({ id: chronicConditions.id, name: chronicConditions.name }).from(chronicConditions)
      .where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt)))
      .orderBy(chronicConditions.createdAt).limit(1),

    // Most recent score, whatever produced it (onboarding/checkup/manual) —
    // null (no row) is the "never calculated" signal, kept distinct from a
    // genuine score of 0 the whole way through (see fixHealthScoreNull note
    // on the frontend side).
    db.select().from(healthScores).where(eq(healthScores.userId, userId))
      .orderBy(desc(healthScores.calculatedAt)).limit(1),

    // testedAt is when the sample was actually taken; createdAt (when the
    // row was written, e.g. via AI-extracted document upload) is the
    // fallback for a result where testedAt wasn't captured — either way,
    // this is real lab-analysis history, not the doctor-facing PDF summary
    // in `reports` (a different thing entirely, see Step 0 report).
    db.select({ testedAt: labResults.testedAt, createdAt: labResults.createdAt })
      .from(labResults)
      .where(and(eq(labResults.userId, userId), isNull(labResults.deletedAt)))
      .orderBy(desc(labResults.testedAt), desc(labResults.createdAt))
      .limit(1),

    findUnreadDoctorReply(userId),
  ]);

  const lastLab = labRow[0];
  const lastLabResultDate = lastLab ? (lastLab.testedAt ?? lastLab.createdAt.toISOString().slice(0, 10)) : null;

  return c.json({
    data: {
      progress,
      hasChronicConditions: chronicRow.length > 0,
      firstChronicConditionName: chronicRow[0]?.name ?? null,
      healthScore: scoreRow[0] ? { total: scoreRow[0].totalScore, calculatedAt: scoreRow[0].calculatedAt } : null,
      lastLabResultDate,
      doctorReply,
    },
  });
});

interface DoctorReplyInfo {
  hasUnread: boolean;
  senderName?: string;
  message?: string;
  sentAt?: string;
  conversationId?: string;
}

/**
 * Same unread computation messaging.ts's own conversation-list endpoint
 * already uses (lastReadAt/clearedAt vs messages.createdAt, comparing two
 * columns of the same table rather than converting a wall-clock timestamp —
 * see that file's own comment on why). The only addition: restricted to
 * conversations whose OTHER participant has role='doctor', and only the
 * single most recent such message across all of them.
 */
async function findUnreadDoctorReply(userId: string): Promise<DoctorReplyInfo> {
  const myConvs = await db.select({ id: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
  const convIds = myConvs.map((r) => r.id);
  if (convIds.length === 0) return { hasUnread: false };

  const doctorConvs = await db
    .select({ convId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, conversationParticipants.userId))
    .where(and(
      inArray(conversationParticipants.conversationId, convIds),
      ne(conversationParticipants.userId, userId),
      eq(aivitaUsers.role, 'doctor'),
    ));
  const doctorConvIds = doctorConvs.map((r) => r.convId);
  if (doctorConvIds.length === 0) return { hasUnread: false };

  const [latest] = await db
    .select({
      convId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      createdAt: messages.createdAt,
      senderName: aivitaUsers.name,
    })
    .from(messages)
    .innerJoin(aivitaUsers, eq(aivitaUsers.id, messages.senderId))
    .innerJoin(conversationParticipants, and(
      eq(conversationParticipants.conversationId, messages.conversationId),
      eq(conversationParticipants.userId, userId),
    ))
    .where(and(
      inArray(messages.conversationId, doctorConvIds),
      ne(messages.senderId, userId),
      isNull(messages.deletedAt),
      or(isNull(conversationParticipants.lastReadAt), gt(messages.createdAt, conversationParticipants.lastReadAt)),
      or(isNull(conversationParticipants.clearedAt), gt(messages.createdAt, conversationParticipants.clearedAt)),
    ))
    .orderBy(desc(messages.createdAt))
    .limit(1);

  if (!latest) return { hasUnread: false };

  return {
    hasUnread: true,
    senderName: latest.senderName ?? undefined,
    message: latest.content ?? undefined,
    sentAt: latest.createdAt.toISOString(),
    conversationId: latest.convId,
  };
}
