import { db, aivitaUsers, healthProfiles, allergies, chronicConditions } from '@medsoft/db';
import { and, count, eq, isNull } from 'drizzle-orm';
import { medicalCardCompletion, type Completion } from './medical-card-completion-core.js';

export { medicalCardCompletion, type Completion } from './medical-card-completion-core.js';

/** Which «нет»-able question: allergies or chronic conditions. */
export type NoneField = 'allergies' | 'chronicConditions';

/** Единственное место, где считается процент заполненности медкарты — его
 * показывают и /medical-card, и профиль. */
export async function loadMedicalCardCompletion(userId: string): Promise<Completion> {
  const [[user], [profile], [allergyCount], [chronicCount]] = await Promise.all([
    db.select({ name: aivitaUsers.name }).from(aivitaUsers).where(eq(aivitaUsers.id, userId)).limit(1),
    db.select().from(healthProfiles).where(eq(healthProfiles.userId, userId)).limit(1),
    db.select({ n: count() }).from(allergies)
      .where(and(eq(allergies.userId, userId), isNull(allergies.deletedAt))),
    db.select({ n: count() }).from(chronicConditions)
      .where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt))),
  ]);
  return medicalCardCompletion({
    name: user?.name,
    birthDate: profile?.birthDate,
    gender: profile?.gender,
    phone: profile?.phone,
    city: profile?.city,
    heightCm: profile?.heightCm,
    weightKg: profile?.weightKg,
    bloodType: profile?.bloodType,
    smokingStatus: profile?.smokingStatus,
    exerciseFrequency: profile?.exerciseFrequency,
    emergencyContactName: profile?.emergencyContactName,
    emergencyContactPhone: profile?.emergencyContactPhone,
    allergiesCount: Number(allergyCount?.n ?? 0),
    allergiesNone: profile?.allergiesNone,
    chronicCount: Number(chronicCount?.n ?? 0),
    chronicNone: profile?.chronicConditionsNone,
  });
}

function noneSet(field: NoneField, value: true | null) {
  return field === 'allergies' ? { allergiesNone: value } : { chronicConditionsNone: value };
}

/** Записать явное «нет» (true) или снять его (false → null, «не указано»).
 * Профиля может ещё не быть (ответ «нет» в опроснике раньше, чем заполнено
 * что-либо ещё) — тогда он создаётся. */
export async function setNoneFlag(userId: string, field: NoneField, none: boolean): Promise<void> {
  const [existing] = await db.select({ id: healthProfiles.id }).from(healthProfiles)
    .where(eq(healthProfiles.userId, userId)).limit(1);
  if (existing) {
    await db.update(healthProfiles)
      .set({ ...noneSet(field, none ? true : null), updatedAt: new Date() })
      .where(eq(healthProfiles.id, existing.id));
  } else if (none) {
    await db.insert(healthProfiles).values({ userId, ...noneSet(field, true) });
  }
}

/** Вызывать при добавлении записей: как только появилась аллергия или
 * болезнь, прежнее «нет» больше не действует. */
export async function clearNoneFlag(userId: string, field: NoneField): Promise<void> {
  const column = field === 'allergies' ? healthProfiles.allergiesNone : healthProfiles.chronicConditionsNone;
  await db.update(healthProfiles)
    .set(noneSet(field, null))
    .where(and(eq(healthProfiles.userId, userId), eq(column, true)));
}

/** Есть ли у человека сейчас хотя бы одна запись этого вида. */
export async function hasActiveItems(userId: string, field: NoneField): Promise<boolean> {
  const rows = field === 'allergies'
    ? await db.select({ id: allergies.id }).from(allergies)
        .where(and(eq(allergies.userId, userId), isNull(allergies.deletedAt))).limit(1)
    : await db.select({ id: chronicConditions.id }).from(chronicConditions)
        .where(and(eq(chronicConditions.userId, userId), isNull(chronicConditions.deletedAt))).limit(1);
  return rows.length > 0;
}
