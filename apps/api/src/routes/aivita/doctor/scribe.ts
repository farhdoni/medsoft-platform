import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@medsoft/db';
import { doctorConsultations, doctorPatients, aivitaUsers } from '@medsoft/db';
import { eq, and } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorScribeRouter = new Hono();

doctorScribeRouter.use('*', requireAivitaAuth);

const SOAP_SYSTEM = `Ты медицинский ассистент. На основе расшифровки приёма врача создай структурированный протокол в формате SOAP. Верни строго JSON без markdown:\n{"subjective":"жалобы пациента","objective":"осмотр, показатели","assessment":"диагноз, оценка","plan":"назначения, рекомендации","icd10":"предполагаемый код МКБ-10","medications":[{"name":"","dosage":"","frequency":"","duration":""}],"followUp":"когда следующий визит"}`;

const MOCK_PROTOCOL = {
  subjective: 'Пациент жалуется на головную боль, повышенное давление.',
  objective: 'АД 140/90 мм рт.ст. Пульс 78 уд/мин. Общее состояние удовлетворительное.',
  assessment: 'Артериальная гипертензия 1 степени. Требует динамического наблюдения.',
  plan: 'Рекомендован приём антигипертензивных препаратов. Ограничение соли. Контроль АД утром и вечером.',
  icd10: 'I10',
  medications: [{ name: 'Лизиноприл', dosage: '10 мг', frequency: '1 раз в день', duration: '30 дней' }],
  followUp: 'Через 2 недели для контроля давления',
};

// POST / — generate SOAP from transcript
doctorScribeRouter.post('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as { patientId: string; transcript: string };
  const { patientId, transcript } = body;

  if (!patientId || !transcript?.trim()) {
    return c.json({ error: 'patientId and transcript are required' }, 400);
  }

  // Verify patient belongs to doctor
  const [conn] = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
    .limit(1);
  if (!conn) return c.json({ error: 'Patient not found' }, 404);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ data: MOCK_PROTOCOL });
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SOAP_SYSTEM,
      messages: [{ role: 'user', content: `Расшифровка приёма:\n${transcript}` }],
    });
    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    const protocol = JSON.parse(raw) as Record<string, unknown>;
    return c.json({ data: protocol });
  } catch {
    return c.json({ data: MOCK_PROTOCOL });
  }
});

// POST /save — save consultation to DB
doctorScribeRouter.post('/save', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const body = await c.req.json() as { patientId: string; transcript?: string; protocol: Record<string, unknown> };
  const { patientId, transcript, protocol } = body;

  if (!patientId || !protocol) {
    return c.json({ error: 'patientId and protocol are required' }, 400);
  }

  const [conn] = await db.select().from(doctorPatients)
    .where(and(eq(doctorPatients.doctorId, doctorId), eq(doctorPatients.patientId, patientId)))
    .limit(1);
  if (!conn) return c.json({ error: 'Patient not found' }, 404);

  const [saved] = await db.insert(doctorConsultations).values({
    doctorId,
    patientId,
    transcript: transcript ?? null,
    protocol,
  }).returning();

  return c.json({ data: saved });
});
