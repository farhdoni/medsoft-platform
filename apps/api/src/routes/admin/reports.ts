import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '@medsoft/db';
import { payments, subscriptions, subscriptionPlans, aivitaUsers, doctorProfiles } from '@medsoft/db';
import { eq, and, gte, lte, count, sql, isNull } from 'drizzle-orm';
import { platformSettings } from '@medsoft/db';
import { inArray } from 'drizzle-orm';

export const adminReportsRouter = new Hono();
adminReportsRouter.use('*', requireAuth);

const AUTO_REPORT_KEYS = ['auto_report_enabled', 'auto_report_email'];

// ─── GET /auto-report ─────────────────────────────────────────────────────────

adminReportsRouter.get('/auto-report', async (c) => {
  const rows = await db.select().from(platformSettings)
    .where(inArray(platformSettings.key, AUTO_REPORT_KEYS));
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value ?? '';
  return c.json({ settings });
});

// ─── PUT /auto-report ─────────────────────────────────────────────────────────

adminReportsRouter.put('/auto-report', async (c) => {
  const body = await c.req.json() as { auto_report_enabled?: string; auto_report_email?: string };
  for (const [key, value] of Object.entries(body)) {
    if (!AUTO_REPORT_KEYS.includes(key)) continue;
    await db.insert(platformSettings)
      .values({ key, value: String(value), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: String(value), updatedAt: new Date() },
      });
  }
  return c.json({ ok: true });
});

// ─── POST /generate ───────────────────────────────────────────────────────────

adminReportsRouter.post('/generate', async (c) => {
  const body = await c.req.json() as {
    type: 'finance' | 'users' | 'doctors' | 'full';
    dateFrom: string;
    dateTo: string;
    format: 'xlsx' | 'pdf';
  };

  const from = new Date(body.dateFrom);
  const to = new Date(body.dateTo);

  // Gather data based on report type
  const sections: Array<{ title: string; headers: string[]; rows: string[][] }> = [];

  if (body.type === 'finance' || body.type === 'full') {
    const paymentRows = await db.select({
      id: payments.id,
      userName: aivitaUsers.name,
      type: payments.type,
      amount: payments.amount,
      currency: payments.currency,
      provider: payments.provider,
      status: payments.status,
      createdAt: payments.createdAt,
    })
      .from(payments)
      .leftJoin(aivitaUsers, eq(payments.userId, aivitaUsers.id))
      .where(and(eq(payments.status, 'completed'), gte(payments.createdAt, from), lte(payments.createdAt, to)))
      .limit(5000);

    sections.push({
      title: 'Финансы',
      headers: ['ID', 'Пользователь', 'Тип', 'Сумма', 'Валюта', 'Провайдер', 'Статус', 'Дата'],
      rows: paymentRows.map(r => [
        String(r.id),
        r.userName ?? '—',
        r.type,
        String(r.amount),
        r.currency,
        r.provider ?? '—',
        r.status,
        r.createdAt.toISOString().slice(0, 10),
      ]),
    });
  }

  if (body.type === 'users' || body.type === 'full') {
    const userRows = await db.select({
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      phone: aivitaUsers.phone,
      role: aivitaUsers.role,
      plan: aivitaUsers.plan,
      createdAt: aivitaUsers.createdAt,
    })
      .from(aivitaUsers)
      .where(and(isNull(aivitaUsers.deletedAt), gte(aivitaUsers.createdAt, from), lte(aivitaUsers.createdAt, to)))
      .limit(10000);

    sections.push({
      title: 'Пользователи',
      headers: ['ID', 'Имя', 'Email', 'Телефон', 'Роль', 'Тариф', 'Дата регистрации'],
      rows: userRows.map(r => [
        r.id.slice(0, 8),
        r.name ?? '—',
        r.email ?? '—',
        r.phone ?? '—',
        r.role,
        r.plan,
        r.createdAt.toISOString().slice(0, 10),
      ]),
    });
  }

  if (body.type === 'doctors' || body.type === 'full') {
    const doctorRows = await db.select({
      id: aivitaUsers.id,
      name: aivitaUsers.name,
      email: aivitaUsers.email,
      specialization: doctorProfiles.specialization,
      verificationStatus: doctorProfiles.verificationStatus,
      rating: doctorProfiles.rating,
      createdAt: aivitaUsers.createdAt,
    })
      .from(aivitaUsers)
      .leftJoin(doctorProfiles, eq(doctorProfiles.userId, aivitaUsers.id))
      .where(and(eq(aivitaUsers.role, 'doctor'), isNull(aivitaUsers.deletedAt)))
      .limit(5000);

    sections.push({
      title: 'Врачи',
      headers: ['ID', 'Имя', 'Email', 'Специализация', 'Верификация', 'Рейтинг', 'Дата'],
      rows: doctorRows.map(r => [
        r.id.slice(0, 8),
        r.name ?? '—',
        r.email ?? '—',
        r.specialization ?? '—',
        r.verificationStatus ?? '—',
        String(r.rating ?? 0),
        r.createdAt.toISOString().slice(0, 10),
      ]),
    });
  }

  const filename = `${body.type}_report_${body.dateFrom}_${body.dateTo}`;

  if (body.format === 'xlsx') {
    // Generate CSV (Excel-compatible)
    const lines: string[] = [];
    for (const section of sections) {
      lines.push(section.title);
      lines.push(section.headers.join(','));
      for (const row of section.rows) {
        lines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      }
      lines.push('');
    }
    const csv = '﻿' + lines.join('\r\n');
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return c.body(csv);
  } else {
    // PDF as HTML
    const htmlSections = sections.map(s => `
      <h2>${s.title}</h2>
      <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px">
        <thead style="background:#f0f0f0">
          <tr>${s.headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${s.rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table><br/>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Отчёт Aivita — ${body.type} — ${body.dateFrom}:${body.dateTo}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #333 }
    h1 { font-size: 18px; } h2 { font-size: 14px; margin-top: 24px; }
    @media print { @page { size: A4 landscape; margin: 1cm } }
  </style>
</head>
<body>
  <h1>Aivita — Отчёт: ${body.type.toUpperCase()}</h1>
  <p>Период: ${body.dateFrom} — ${body.dateTo}</p>
  <p>Сформирован: ${new Date().toLocaleString('ru-RU')}</p>
  ${htmlSections}
  <script>window.onload=()=>window.print()</script>
</body>
</html>`;

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `inline; filename="${filename}.html"`);
    return c.body(html);
  }
});
