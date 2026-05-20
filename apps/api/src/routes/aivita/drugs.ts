import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { drugInteractions, medicationSchedule } from '@medsoft/db';
import { eq, and, ilike, or } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';
import Anthropic from '@anthropic-ai/sdk';

export const aivitaDrugsRouter = new Hono();

aivitaDrugsRouter.use('*', requireAivitaAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function lookupPair(drug1: string, drug2: string) {
  const [row] = await db.select().from(drugInteractions)
    .where(
      or(
        and(ilike(drugInteractions.drug1, `%${drug1}%`), ilike(drugInteractions.drug2, `%${drug2}%`)),
        and(ilike(drugInteractions.drug1, `%${drug2}%`), ilike(drugInteractions.drug2, `%${drug1}%`)),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function askClaude(drug1: string, drug2: string): Promise<{
  severity: string;
  description: string;
  recommendation: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      severity: 'none',
      description: 'Данные о взаимодействии отсутствуют в базе.',
      recommendation: 'Проконсультируйтесь с врачом или фармацевтом.',
    };
  }

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Проверь совместимость лекарств "${drug1}" и "${drug2}". Ответь строго JSON без markdown: {"severity":"critical|major|moderate|minor|none","description":"краткое описание взаимодействия на русском","recommendation":"что делать пациенту на русском"}`,
      }],
    });
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    const json = JSON.parse(text) as { severity: string; description: string; recommendation: string };
    if (!json.severity || !json.description) throw new Error('bad json');
    return json;
  } catch {
    return {
      severity: 'none',
      description: 'Не удалось получить данные о взаимодействии.',
      recommendation: 'Проконсультируйтесь с врачом или фармацевтом.',
    };
  }
}

function buildSummary(pairs: Array<{ severity: string; drug1: string; drug2: string }>) {
  const counts: Record<string, number> = {};
  for (const p of pairs) counts[p.severity] = (counts[p.severity] ?? 0) + 1;

  if (counts.critical) return `⛔ Обнаружено ${counts.critical} критичных взаимодействий! Немедленно проконсультируйтесь с врачом.`;
  if (counts.major) return `⚠️ Обнаружено ${counts.major} серьёзных взаимодействий. Рекомендуется консультация врача.`;
  if (counts.moderate) return `ℹ️ Обнаружено ${counts.moderate} умеренных взаимодействий. Соблюдайте осторожность.`;
  if (counts.minor) return `💬 Обнаружены незначительные взаимодействия.`;
  return `✅ Опасных взаимодействий не выявлено.`;
}

// ─── POST /check — проверить список препаратов ────────────────────────────────

aivitaDrugsRouter.post('/check', async (c) => {
  const body = await c.req.json() as { drugs?: string[] };
  const drugs = (body.drugs ?? []).map((d) => d.trim()).filter(Boolean);

  if (drugs.length < 2) {
    return c.json({ error: 'Укажите минимум 2 лекарства' }, 400);
  }

  const pairs: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
    recommendation: string;
    source: string;
  }> = [];

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const d1 = drugs[i]!;
      const d2 = drugs[j]!;

      let row = await lookupPair(d1, d2);

      if (!row) {
        const ai = await askClaude(d1, d2);
        const [inserted] = await db.insert(drugInteractions).values({
          drug1: d1,
          drug2: d2,
          severity: ai.severity,
          description: ai.description,
          recommendation: ai.recommendation,
          source: 'AIVITA AI',
        }).returning();
        row = inserted ?? null;
      }

      pairs.push({
        drug1: row?.drug1 ?? d1,
        drug2: row?.drug2 ?? d2,
        severity: row?.severity ?? 'none',
        description: row?.description ?? '',
        recommendation: row?.recommendation ?? '',
        source: row?.source ?? 'AIVITA AI',
      });
    }
  }

  return c.json({ data: { pairs, summary: buildSummary(pairs) } });
});

// ─── GET /patient-meds — врач: список лекарств пациента ──────────────────────

aivitaDrugsRouter.get('/patient-meds', async (c) => {
  const session = c.get('aivitaSession');
  if (session.role !== 'doctor') {
    return c.json({ error: 'Doctor only' }, 403);
  }
  const patientId = c.req.query('patientId');
  if (!patientId) return c.json({ error: 'patientId required' }, 400);

  const meds = await db.select({
    id: medicationSchedule.id,
    title: medicationSchedule.title,
    dosage: medicationSchedule.dosage,
  }).from(medicationSchedule)
    .where(and(
      eq(medicationSchedule.userId, patientId),
      eq(medicationSchedule.isActive, true),
    ));

  return c.json({ data: meds });
});

// ─── POST /check-for-patient — врач: проверить новый препарат против лекарств пациента ──

aivitaDrugsRouter.post('/check-for-patient', async (c) => {
  const session = c.get('aivitaSession');
  if (session.role !== 'doctor') {
    return c.json({ error: 'Doctor only' }, 403);
  }
  const body = await c.req.json() as { patientId?: string; newDrug?: string };
  const { patientId, newDrug } = body;
  if (!patientId || !newDrug) {
    return c.json({ error: 'patientId and newDrug required' }, 400);
  }

  const meds = await db.select({ title: medicationSchedule.title })
    .from(medicationSchedule)
    .where(and(
      eq(medicationSchedule.userId, patientId),
      eq(medicationSchedule.isActive, true),
    ));

  const patientDrugs = [...new Set(meds.map((m) => m.title))];

  if (patientDrugs.length === 0) {
    return c.json({ data: { interactions: [], patientDrugs: [], safe: true } });
  }

  const interactions: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
    recommendation: string;
  }> = [];

  for (const existing of patientDrugs) {
    let row = await lookupPair(newDrug, existing);
    if (!row) {
      const ai = await askClaude(newDrug, existing);
      const [inserted] = await db.insert(drugInteractions).values({
        drug1: newDrug,
        drug2: existing,
        severity: ai.severity,
        description: ai.description,
        recommendation: ai.recommendation,
        source: 'AIVITA AI',
      }).returning();
      row = inserted ?? null;
    }
    interactions.push({
      drug1: row?.drug1 ?? newDrug,
      drug2: row?.drug2 ?? existing,
      severity: row?.severity ?? 'none',
      description: row?.description ?? '',
      recommendation: row?.recommendation ?? '',
    });
  }

  const safe = !interactions.some((i) => i.severity === 'critical' || i.severity === 'major');
  return c.json({ data: { interactions, patientDrugs, safe } });
});

// ─── GET /my-check — проверить текущие лекарства пациента ────────────────────

aivitaDrugsRouter.get('/my-check', async (c) => {
  const userId = c.get('aivitaUserId');

  const meds = await db.select({ title: medicationSchedule.title })
    .from(medicationSchedule)
    .where(and(
      eq(medicationSchedule.userId, userId),
      eq(medicationSchedule.isActive, true),
    ));

  const drugs = [...new Set(meds.map((m) => m.title))];

  if (drugs.length < 2) {
    return c.json({ data: { pairs: [], summary: '✅ Недостаточно лекарств для проверки (минимум 2).', drugs } });
  }

  const pairs: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
    recommendation: string;
    source: string;
  }> = [];

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const d1 = drugs[i]!;
      const d2 = drugs[j]!;

      let row = await lookupPair(d1, d2);

      if (!row) {
        const ai = await askClaude(d1, d2);
        const [inserted] = await db.insert(drugInteractions).values({
          drug1: d1,
          drug2: d2,
          severity: ai.severity,
          description: ai.description,
          recommendation: ai.recommendation,
          source: 'AIVITA AI',
        }).returning();
        row = inserted ?? null;
      }

      pairs.push({
        drug1: row?.drug1 ?? d1,
        drug2: row?.drug2 ?? d2,
        severity: row?.severity ?? 'none',
        description: row?.description ?? '',
        recommendation: row?.recommendation ?? '',
        source: row?.source ?? 'AIVITA AI',
      });
    }
  }

  return c.json({ data: { pairs, summary: buildSummary(pairs), drugs } });
});
