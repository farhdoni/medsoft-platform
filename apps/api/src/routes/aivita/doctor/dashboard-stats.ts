import { Hono } from 'hono';
import { db } from '@medsoft/db';
import { payments, doctorPayouts, aivitaAppointments, doctorPatients } from '@medsoft/db';
import { eq, and, gte, lte, lt, count, sum } from 'drizzle-orm';
import { requireAivitaAuth } from '../../../middleware/aivita-auth.js';

export const doctorDashboardStatsRouter = new Hono();

doctorDashboardStatsRouter.use('*', requireAivitaAuth);

// ─── helpers ──────────────────────────────────────────────────────────────────

function getPeriodRange(period: string): { start: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (period === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    prevStart = new Date(start.getTime() - 86400000);
    prevEnd = new Date(start.getTime() - 1);
  } else if (period === 'week') {
    const day = now.getDay() || 7; // Mon=1
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1), 0, 0, 0);
    prevStart = new Date(start.getTime() - 7 * 86400000);
    prevEnd = new Date(start.getTime() - 1);
  } else {
    // month
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }
  return { start, prevStart, prevEnd };
}

function buildChartLabels(period: string, start: Date): Array<{ label: string; ts: Date }> {
  const result: Array<{ label: string; ts: Date }> = [];
  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const ts = new Date(start);
      ts.setHours(h, 0, 0, 0);
      result.push({ label: `${String(h).padStart(2, '0')}:00`, ts });
    }
  } else if (period === 'week') {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    for (let i = 0; i < 7; i++) {
      const ts = new Date(start.getTime() + i * 86400000);
      result.push({ label: days[i], ts });
    }
  } else {
    const year = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const ts = new Date(year, month, d);
      result.push({ label: String(d), ts });
    }
  }
  return result;
}

// ─── GET /v1/aivita/doctor/dashboard-stats?period=day|week|month ─────────────

doctorDashboardStatsRouter.get('/', async (c) => {
  const doctorId = c.get('aivitaUserId');
  const period = (c.req.query('period') ?? 'week') as string;

  const { start, prevStart, prevEnd } = getPeriodRange(period);
  const now = new Date();

  try {
    // ── current period payments (earnings) ──
    const [earningsRow] = await db
      .select({ total: sum(payments.netAmount) })
      .from(payments)
      .where(and(
        eq(payments.userId, doctorId),
        eq(payments.type, 'consultation'),
        eq(payments.status, 'completed'),
        gte(payments.createdAt, start),
        lte(payments.createdAt, now),
      ));
    const totalEarnings = Number(earningsRow?.total ?? 0);

    // ── prev period payments ──
    const [prevEarningsRow] = await db
      .select({ total: sum(payments.netAmount) })
      .from(payments)
      .where(and(
        eq(payments.userId, doctorId),
        eq(payments.type, 'consultation'),
        eq(payments.status, 'completed'),
        gte(payments.createdAt, prevStart),
        lte(payments.createdAt, prevEnd),
      ));
    const prevEarnings = Number(prevEarningsRow?.total ?? 0);
    const earningsChange = prevEarnings > 0
      ? Math.round(((totalEarnings - prevEarnings) / prevEarnings) * 100)
      : 0;

    // ── consultations (completed appointments) ──
    const [consRow] = await db
      .select({ cnt: count() })
      .from(aivitaAppointments)
      .where(and(
        eq(aivitaAppointments.doctorId, doctorId),
        eq(aivitaAppointments.status, 'completed'),
        gte(aivitaAppointments.scheduledAt, start),
        lte(aivitaAppointments.scheduledAt, now),
      ));
    const consultationsCount = Number(consRow?.cnt ?? 0);

    const [prevConsRow] = await db
      .select({ cnt: count() })
      .from(aivitaAppointments)
      .where(and(
        eq(aivitaAppointments.doctorId, doctorId),
        eq(aivitaAppointments.status, 'completed'),
        gte(aivitaAppointments.scheduledAt, prevStart),
        lte(aivitaAppointments.scheduledAt, prevEnd),
      ));
    const prevConsultations = Number(prevConsRow?.cnt ?? 0);
    const consultationsChange = prevConsultations > 0
      ? Math.round(((consultationsCount - prevConsultations) / prevConsultations) * 100)
      : 0;

    // ── online / offline split ──
    const [onlineRow] = await db
      .select({ cnt: count() })
      .from(aivitaAppointments)
      .where(and(
        eq(aivitaAppointments.doctorId, doctorId),
        eq(aivitaAppointments.status, 'completed'),
        eq(aivitaAppointments.type, 'online'),
        gte(aivitaAppointments.scheduledAt, start),
        lte(aivitaAppointments.scheduledAt, now),
      ));
    const onlineCount = Number(onlineRow?.cnt ?? 0);
    const offlineCount = consultationsCount - onlineCount;

    // ── new patients in period ──
    const [newPatientsRow] = await db
      .select({ cnt: count() })
      .from(doctorPatients)
      .where(and(
        eq(doctorPatients.doctorId, doctorId),
        gte(doctorPatients.createdAt, start),
        lte(doctorPatients.createdAt, now),
      ));
    const newPatientsCount = Number(newPatientsRow?.cnt ?? 0);

    // ── pending payouts ──
    const [pendingRow] = await db
      .select({ total: sum(doctorPayouts.amount) })
      .from(doctorPayouts)
      .where(and(
        eq(doctorPayouts.doctorId, doctorId),
        eq(doctorPayouts.status, 'pending'),
      ));
    const pendingPayouts = Number(pendingRow?.total ?? 0);

    // ── chart data ──
    const chartLabels = buildChartLabels(period, start);

    // Fetch all appointments in period for chart binning
    const chartAppts = await db
      .select({ scheduledAt: aivitaAppointments.scheduledAt })
      .from(aivitaAppointments)
      .where(and(
        eq(aivitaAppointments.doctorId, doctorId),
        gte(aivitaAppointments.scheduledAt, start),
        lt(aivitaAppointments.scheduledAt, period === 'day'
          ? new Date(start.getTime() + 86400000)
          : period === 'week'
            ? new Date(start.getTime() + 7 * 86400000)
            : new Date(start.getFullYear(), start.getMonth() + 1, 1)),
      ));

    // Fetch all payments in period for chart value binning
    const chartPayments = await db
      .select({ createdAt: payments.createdAt, netAmount: payments.netAmount })
      .from(payments)
      .where(and(
        eq(payments.userId, doctorId),
        eq(payments.type, 'consultation'),
        eq(payments.status, 'completed'),
        gte(payments.createdAt, start),
        lte(payments.createdAt, now),
      ));

    const chartData = chartLabels.map((slot, idx) => {
      const slotStart = slot.ts;
      let slotEnd: Date;
      if (period === 'day') {
        slotEnd = new Date(slotStart.getTime() + 3600000); // +1 hour
      } else {
        slotEnd = new Date(slotStart.getTime() + 86400000); // +1 day
      }

      const apptCount = chartAppts.filter(a => {
        const t = new Date(a.scheduledAt).getTime();
        return t >= slotStart.getTime() && t < slotEnd.getTime();
      }).length;

      const earnValue = chartPayments
        .filter(p => {
          const t = new Date(p.createdAt).getTime();
          return t >= slotStart.getTime() && t < slotEnd.getTime();
        })
        .reduce((s, p) => s + Number(p.netAmount ?? 0), 0);

      return {
        label: slot.label,
        value: earnValue || apptCount * 0, // prefer earnings, fallback to count for bar height
        consultations: apptCount,
        idx,
      };
    });

    // If no earnings data at all, use appointment counts as bar height proxy
    const hasEarnings = chartData.some(d => d.value > 0);
    const finalChartData = hasEarnings
      ? chartData
      : chartData.map(d => ({ ...d, value: d.consultations }));

    return c.json({
      data: {
        totalEarnings,
        earningsChange,
        consultationsCount,
        consultationsChange,
        onlineCount,
        offlineCount,
        newPatientsCount,
        pendingPayouts,
        chartData: finalChartData,
      },
    });
  } catch (err) {
    // Always return zeros on error
    const chartLabels = buildChartLabels(period, getPeriodRange(period).start);
    return c.json({
      data: {
        totalEarnings: 0,
        earningsChange: 0,
        consultationsCount: 0,
        consultationsChange: 0,
        onlineCount: 0,
        offlineCount: 0,
        newPatientsCount: 0,
        pendingPayouts: 0,
        chartData: chartLabels.map((s, idx) => ({ label: s.label, value: 0, consultations: 0, idx })),
      },
    });
  }
});
