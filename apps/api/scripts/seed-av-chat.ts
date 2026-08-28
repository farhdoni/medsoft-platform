/**
 * Dev/e2e сид для AV Chat.
 *
 * Приводит базу к детерминированному состоянию, от которого стартует
 * прогон e2e/av-chat.spec.ts:
 *
 *   farhodni  — тестовый аккаунт (пароль fara2122), собеседник Алисы
 *   alice_av  — единственный видимый диалог, 3 сообщения + реакции
 *   bob_av    — существует, но диалога нет: цель поиска по @имени
 *   dave_av   — существует, диалога нет, пароль известен: им проверяется
 *               403 restricted при «Только знакомые могут писать»
 *   aivita    — официальный аккаунт поддержки (ник из SUPPORT_USER_NICKNAME)
 *
 * Идемпотентен и, что важнее, ВОЗВРАЩАЮЩИЙ: каждый запуск снимает блокировки
 * farhodni, сбрасывает avChat-настройки, снимает пин/mute/архив и стирает
 * диалоги farhodni со всеми, кроме Алисы. Иначе второй прогон стартовал бы
 * из состояния, которое оставил первый.
 *
 * Тот же db-клиент и bcryptjs (cost 12), что и боевой роут
 * /v1/aivita/auth/login, поэтому пароль хешируется идентично приложению.
 *
 * Запуск (из apps/api):  npx tsx --env-file .env scripts/seed-av-chat.ts
 */
import {
  db,
  aivitaUsers,
  conversations,
  conversationParticipants,
  messages,
  messageReactions,
  userBlocks,
} from '@medsoft/db';
import { eq, and, inArray, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const FARHOD_PASSWORD = process.env.SEED_FARHOD_PASSWORD ?? 'fara2122';
// Пароли dave_av и alice_av: под ними e2e логинится напрямую в API, минуя
// браузер, — иначе действие второй стороны (её сообщение, её попытка написать)
// прогону недоступно.
const DAVE_PASSWORD = process.env.SEED_DAVE_PASSWORD ?? 'dave2122';
const ALICE_PASSWORD = process.env.SEED_ALICE_PASSWORD ?? 'alice2122';
const SUPPORT_NICKNAME = (process.env.SUPPORT_USER_NICKNAME ?? 'aivita').toLowerCase();

async function upsertUser(opts: {
  nickname: string;
  email: string;
  name: string;
  password: string;
  provider?: string;
}): Promise<{ id: string; created: boolean }> {
  const now = new Date();
  const passwordHash = await bcrypt.hash(opts.password, 12);
  const existing = await db.query.aivitaUsers.findFirst({
    where: eq(aivitaUsers.nickname, opts.nickname.toLowerCase()),
  });

  if (existing) {
    await db.update(aivitaUsers).set({
      email: opts.email.toLowerCase(),
      name: opts.name,
      passwordHash,
      provider: opts.provider ?? 'email',
      emailVerified: now,          // timestamp = "подтверждён"
      phoneVerified: now,
      onboardingCompleted: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      deletedAt: null,
      updatedAt: now,
    }).where(eq(aivitaUsers.id, existing.id));
    return { id: existing.id, created: false };
  }

  const [row] = await db.insert(aivitaUsers).values({
    email: opts.email.toLowerCase(),
    nickname: opts.nickname.toLowerCase(),
    name: opts.name,
    provider: opts.provider ?? 'email',
    passwordHash,
    role: 'patient',
    plan: 'free',
    emailVerified: now,
    phoneVerified: now,
    onboardingCompleted: true,
  }).returning({ id: aivitaUsers.id });
  return { id: row.id, created: true };
}

/** Сбрасывает avChat-блок в preferences, не трогая остальные ключи. */
async function resetAvChatSettings(userId: string) {
  const [row] = await db
    .select({ preferences: aivitaUsers.preferences })
    .from(aivitaUsers)
    .where(eq(aivitaUsers.id, userId))
    .limit(1);
  const prefs = { ...((row?.preferences as Record<string, unknown> | null) ?? {}) };
  delete prefs.avChat;
  await db.update(aivitaUsers).set({ preferences: prefs }).where(eq(aivitaUsers.id, userId));
}

async function main() {
  // ── 1. Пользователи ──────────────────────────────────────────────────────
  const farhod = await upsertUser({
    nickname: 'farhodni',
    email: 'farhodni@local.dev',
    name: 'Farhod',
    password: FARHOD_PASSWORD,
  });
  // Собеседник в единственном видимом диалоге.
  const alice = await upsertUser({
    nickname: 'alice_av',
    email: 'alice_av@local.dev',
    name: 'Alice',
    password: ALICE_PASSWORD,
  });
  // Цель поиска по @имени: существует, но диалога с ним нет.
  const bob = await upsertUser({
    nickname: 'bob_av',
    email: 'bob_av@local.dev',
    name: 'Bob',
    password: 'bob-' + Math.random().toString(36).slice(2),
    provider: 'mock',
  });
  // Под ним e2e стучится в API, поэтому пароль детерминированный.
  const dave = await upsertUser({
    nickname: 'dave_av',
    email: 'dave_av@local.dev',
    name: 'Dave',
    password: DAVE_PASSWORD,
  });
  const support = await upsertUser({
    nickname: SUPPORT_NICKNAME,
    email: `${SUPPORT_NICKNAME}@local.dev`,
    name: 'AIVITA',
    password: 'support-' + Math.random().toString(36).slice(2),
    provider: 'mock',
  });

  console.log(`farhodni: ${farhod.id} (${farhod.created ? 'создан' : 'обновлён'})`);
  console.log(`alice_av: ${alice.id} (${alice.created ? 'создан' : 'обновлён'})`);
  console.log(`bob_av:   ${bob.id} (${bob.created ? 'создан' : 'обновлён'})`);
  console.log(`dave_av:  ${dave.id} (${dave.created ? 'создан' : 'обновлён'})`);
  console.log(`@${SUPPORT_NICKNAME}: ${support.id} (${support.created ? 'создан' : 'обновлён'})`);

  // ── 2. Сброс состояния, оставшегося от прошлого прогона ──────────────────
  await db.delete(userBlocks).where(eq(userBlocks.blockerId, farhod.id));
  await db.delete(userBlocks).where(eq(userBlocks.blockedId, farhod.id));
  await resetAvChatSettings(farhod.id);
  await resetAvChatSettings(dave.id);
  console.log('блокировки сняты, avChat-настройки сброшены');

  const myConvRows = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, farhod.id));
  const myConvIds = myConvRows.map((r) => r.conversationId);

  // Диалог с Алисой оставляем, всё прочее (поддержка, dave, bob из прошлых
  // прогонов) сносим — иначе «Только знакомые» перестанет отдавать 403,
  // а список диалогов будет расти от запуска к запуску.
  let conversationId: string | null = null;
  if (myConvIds.length) {
    const shared = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.userId, alice.id),
        inArray(conversationParticipants.conversationId, myConvIds),
      ));
    if (shared.length) conversationId = shared[0].conversationId;

    const stale = myConvIds.filter((id) => id !== conversationId);
    if (stale.length) {
      await db.delete(conversations).where(inArray(conversations.id, stale));
      console.log(`удалено посторонних диалогов: ${stale.length}`);
    }
  }

  // Отсчёт от «пять минут назад»: метки сообщений обязаны лежать в ПРОШЛОМ.
  // Непрочитанное считается как created_at > last_read_at, и сообщение из
  // будущего оставалось бы непрочитанным даже после открытия диалога.
  const now = Date.now() - 5 * 60_000;
  if (!conversationId) {
    const [conv] = await db.insert(conversations).values({
      type: 'direct',
      status: 'active',
      lastMessageAt: new Date(now),
    }).returning({ id: conversations.id });
    conversationId = conv.id;
    await db.insert(conversationParticipants).values([
      { conversationId, userId: farhod.id },
      { conversationId, userId: alice.id },
    ]);
    console.log(`диалог создан: ${conversationId}`);
  } else {
    // Пин/mute/архив — это состояние участника, и шаг P его меняет.
    await db.update(conversationParticipants)
      .set({ pinnedAt: null, mutedUntil: null, archivedAt: null })
      .where(eq(conversationParticipants.conversationId, conversationId));
    console.log(`диалог переиспользован: ${conversationId} (пин/mute/архив сняты)`);
  }

  // ── 3. Сообщения ─────────────────────────────────────────────────────────
  // Полностью пересобираем ленту: прошлый прогон оставляет в ней отправленные
  // тексты, гифки, голосовые и удалённые сообщения.
  await db.delete(messages).where(eq(messages.conversationId, conversationId));

  // m1: farhodni → текст
  const [m1] = await db.insert(messages).values({
    conversationId, senderId: farhod.id, type: 'text',
    content: 'Привет, Алиса! Смотрю новый мессенджер — как тебе?',
    createdAt: new Date(now),
  }).returning({ id: messages.id });

  // m2: alice → ответ С ЦИТАТОЙ (replyToId = m1)
  const [m2] = await db.insert(messages).values({
    conversationId, senderId: alice.id, type: 'text',
    content: 'Привет! Отвечаю на твоё сообщение — по-моему, огонь 🔥',
    replyToId: m1.id,
    createdAt: new Date(now + 60_000),
  }).returning({ id: messages.id });

  // m3: farhodni → ещё одно
  const [m3] = await db.insert(messages).values({
    conversationId, senderId: farhod.id, type: 'text',
    content: 'Согласен! Даже реакции есть 👍',
    createdAt: new Date(now + 120_000),
  }).returning({ id: messages.id });

  // m4: alice → последнее и НЕПРОЧИТАННОЕ. Вместе со сбросом last_read_at
  // ниже это даёт бейдж непрочитанного на центральной кнопке навбара —
  // то, что проверяет шаг C.
  const [m4] = await db.insert(messages).values({
    conversationId, senderId: alice.id, type: 'text',
    content: 'Кстати, ты уже пробовал стикеры и гифки? 😄',
    createdAt: new Date(now + 180_000),
  }).returning({ id: messages.id });

  await db.update(conversations)
    .set({ lastMessageAt: new Date(now + 180_000) })
    .where(eq(conversations.id, conversationId));

  await db.update(conversationParticipants)
    .set({ lastReadAt: null })
    .where(and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.userId, farhod.id),
    ));

  // ── 4. Реакции ───────────────────────────────────────────────────────────
  await db.insert(messageReactions).values([
    { messageId: m1.id, userId: alice.id,  emoji: '❤️' }, // Алиса лайкнула первое
    { messageId: m2.id, userId: farhod.id, emoji: '🔥' }, // Фарход — на ответ с цитатой
  ]);

  console.log(`сообщения: m1=${m1.id} m2(reply→m1)=${m2.id} m3=${m3.id} m4(unread)=${m4.id}`);
  console.log('реакции: ❤️ на m1 (от alice), 🔥 на m2 (от farhodni)');
  console.log('\nГОТОВО.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
