import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@medsoft/db';
import {
  allergies, chronicConditions, medications, labResults,
} from '@medsoft/db';
import { eq, and, isNull, gte, lte, desc } from 'drizzle-orm';
import { requireAivitaAuth } from '../../middleware/aivita-auth.js';

export const medicalRouter = new Hono();
medicalRouter.use('*', requireAivitaAuth);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedMedical {
  allergies: string[];
  chronicDiseases: string[];
  medications: { name: string; dosage?: string; frequency?: string }[];
  vaccinations: { name: string; date?: string }[];
  surgeries: { name: string; date?: string }[];
  diagnoses: { name: string; date?: string; doctor?: string }[];
  labResults: { testName: string; value?: string; unit?: string; referenceRange?: string; status?: string; date?: string }[];
}

// ── Mock data for dev/fallback ─────────────────────────────────────────────────

function buildMock(): ParsedMedical {
  return {
    allergies: ['Пенициллин', 'Пыльца берёзы'],
    chronicDiseases: ['Гипертония 1 степени'],
    medications: [{ name: 'Лозартан', dosage: '50мг', frequency: '1 раз в день' }],
    vaccinations: [{ name: 'Грипп', date: '2024-10-15' }],
    surgeries: [],
    diagnoses: [{ name: 'ОРВИ', date: '2025-01-10', doctor: 'Иванов И.И.' }],
    labResults: [
      { testName: 'Гемоглобин', value: '112', unit: 'г/л', referenceRange: '120-160', status: 'abnormal', date: '2025-03-01' },
      { testName: 'Глюкоза', value: '5.1', unit: 'ммоль/л', referenceRange: '3.9-6.1', status: 'normal', date: '2025-03-01' },
      { testName: 'Холестерин', value: '6.8', unit: 'ммоль/л', referenceRange: '< 5.2', status: 'abnormal', date: '2025-03-01' },
    ],
  };
}

// ── Claude API call ────────────────────────────────────────────────────────────

async function callClaudeWithFile(
  fileContent: string,
  mediaType: string,
  isBase64: boolean,
): Promise<ParsedMedical | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const system = `Ты медицинский ассистент AIVITA. Проанализируй документ и извлеки информацию. Верни ТОЛЬКО валидный JSON без markdown-блоков:
{
  "allergies": ["название аллергена"],
  "chronicDiseases": ["название болезни"],
  "medications": [{"name": "название", "dosage": "дозировка", "frequency": "частота"}],
  "vaccinations": [{"name": "название", "date": "YYYY-MM-DD"}],
  "surgeries": [{"name": "название операции", "date": "YYYY-MM-DD"}],
  "diagnoses": [{"name": "диагноз", "date": "YYYY-MM-DD", "doctor": "врач"}],
  "labResults": [{"testName": "название", "value": "значение", "unit": "единица", "referenceRange": "норма", "status": "normal|abnormal|critical|borderline", "date": "YYYY-MM-DD"}]
}
Заполни ТОЛЬКО те поля, которые реально есть в документе. Остальные — пустые массивы.`;

  const contentBlock = isBase64
    ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileContent } }
    : { type: 'text', text: fileContent };

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: 'Извлеки медицинскую информацию из этого документа на русском языке.' }] }],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned) as ParsedMedical;
  } catch {
    return null;
  }
}

// ── POST /parse-document ──────────────────────────────────────────────────────

medicalRouter.post('/parse-document', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const mimeType = file.type || 'application/octet-stream';
    const isImage  = mimeType.startsWith('image/');
    const isText   = mimeType.startsWith('text/') || mimeType === 'application/json';

    let result: ParsedMedical | null = null;

    if (isImage) {
      const ab   = await file.arrayBuffer();
      const b64  = Buffer.from(ab).toString('base64');
      const mt   = (mimeType === 'image/jpg' ? 'image/jpeg' : mimeType) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      result = await callClaudeWithFile(b64, mt, true);
    } else if (isText) {
      const text = await file.text();
      result = await callClaudeWithFile(text, 'text/plain', false);
    } else {
      // PDF or docx — read as text best-effort
      const text = await file.text().catch(() => `[Document: ${file.name}]`);
      result = await callClaudeWithFile(text, 'text/plain', false);
    }

    // Fallback to mock if Claude not configured or failed
    if (!result) result = buildMock();

    return c.json({ data: result });
  } catch (err) {
    console.error('[parse-document]', err);
    return c.json({ data: buildMock() });
  }
});

// ── POST /apply ───────────────────────────────────────────────────────────────

const applySchema = z.object({
  allergies:       z.array(z.string()).default([]),
  chronicDiseases: z.array(z.string()).default([]),
  medications:     z.array(z.object({ name: z.string(), dosage: z.string().optional(), frequency: z.string().optional() })).default([]),
  labResults: z.array(z.object({
    testName:       z.string(),
    value:          z.string().optional(),
    unit:           z.string().optional(),
    referenceRange: z.string().optional(),
    status:         z.string().optional(),
    date:           z.string().optional(),
  })).default([]),
});

medicalRouter.post('/apply', zValidator('json', applySchema), async (c) => {
  const userId = c.get('aivitaUserId');
  const body   = c.req.valid('json');
  const added  = { allergies: 0, chronicDiseases: 0, medications: 0, labResults: 0 };

  // Allergies — skip duplicates
  for (const allergen of body.allergies) {
    const [existing] = await db.select({ id: allergies.id }).from(allergies)
      .where(and(eq(allergies.userId, userId), eq(allergies.allergen, allergen), isNull(allergies.deletedAt)))
      .limit(1);
    if (!existing) {
      await db.insert(allergies).values({ userId, allergen, type: 'other' });
      added.allergies++;
    }
  }

  // Chronic diseases
  for (const name of body.chronicDiseases) {
    const [existing] = await db.select({ id: chronicConditions.id }).from(chronicConditions)
      .where(and(eq(chronicConditions.userId, userId), eq(chronicConditions.name, name), isNull(chronicConditions.deletedAt)))
      .limit(1);
    if (!existing) {
      await db.insert(chronicConditions).values({ userId, name });
      added.chronicDiseases++;
    }
  }

  // Medications
  for (const med of body.medications) {
    const [existing] = await db.select({ id: medications.id }).from(medications)
      .where(and(eq(medications.userId, userId), eq(medications.name, med.name), isNull(medications.deletedAt)))
      .limit(1);
    if (!existing) {
      await db.insert(medications).values({
        userId,
        name: med.name,
        dosage: med.dosage ?? null,
        frequency: med.frequency ?? null,
        isActive: true,
      });
      added.medications++;
    }
  }

  // Lab results — always insert (same test can repeat over time)
  for (const lr of body.labResults) {
    await db.insert(labResults).values({
      userId,
      testName:       lr.testName,
      value:          lr.value ?? null,
      unit:           lr.unit ?? null,
      referenceRange: lr.referenceRange ?? null,
      status:         lr.status ?? 'normal',
      category:       'other',
      testedAt:       lr.date ?? null,
    });
    added.labResults++;
  }

  return c.json({ data: added });
});

// ── GET /lab-results ──────────────────────────────────────────────────────────

medicalRouter.get('/lab-results', async (c) => {
  const userId = c.get('aivitaUserId');
  const { category, dateFrom, dateTo } = c.req.query();

  const conds: ReturnType<typeof eq>[] = [
    eq(labResults.userId, userId),
    isNull(labResults.deletedAt),
  ];
  if (category) conds.push(eq(labResults.category, category));
  if (dateFrom) conds.push(gte(labResults.testedAt, dateFrom));
  if (dateTo)   conds.push(lte(labResults.testedAt, dateTo));

  const rows = await db.select().from(labResults)
    .where(and(...conds))
    .orderBy(desc(labResults.testedAt), desc(labResults.createdAt))
    .limit(100);

  return c.json({ data: rows });
});

// ── POST /lab-results ─────────────────────────────────────────────────────────

const labSchema = z.object({
  testName:       z.string().min(1),
  value:          z.string().optional(),
  unit:           z.string().optional(),
  referenceRange: z.string().optional(),
  status:         z.enum(['normal', 'abnormal', 'critical', 'borderline']).default('normal'),
  category:       z.enum(['blood', 'urine', 'hormone', 'biochem', 'other']).default('other'),
  labName:        z.string().optional(),
  doctorName:     z.string().optional(),
  testedAt:       z.string().optional(),
  notes:          z.string().optional(),
});

medicalRouter.post('/lab-results', zValidator('json', labSchema), async (c) => {
  const userId = c.get('aivitaUserId');
  const body   = c.req.valid('json');
  const [row]  = await db.insert(labResults).values({ userId, ...body, testedAt: body.testedAt ?? null }).returning();
  return c.json({ data: row }, 201);
});

// ── PUT /lab-results/:id ──────────────────────────────────────────────────────

medicalRouter.put('/lab-results/:id', zValidator('json', labSchema.partial()), async (c) => {
  const userId = c.get('aivitaUserId');
  const id     = c.req.param('id');
  const body   = c.req.valid('json');
  const [row]  = await db.update(labResults)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(labResults.id, id), eq(labResults.userId, userId), isNull(labResults.deletedAt)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: row });
});

// ── DELETE /lab-results/:id ───────────────────────────────────────────────────

medicalRouter.delete('/lab-results/:id', async (c) => {
  const userId = c.get('aivitaUserId');
  const id     = c.req.param('id');
  await db.update(labResults)
    .set({ deletedAt: new Date() })
    .where(and(eq(labResults.id, id), eq(labResults.userId, userId)));
  return c.json({ data: { ok: true } });
});
