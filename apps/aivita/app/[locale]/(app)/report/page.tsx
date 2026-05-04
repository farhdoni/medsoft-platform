import { Download, Link2 } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import { loadReportData } from './data';
import { GenerateReportButton } from './GenerateReportButton';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
}

const REPORT_CONTENTS = [
  'Личные данные и антропометрия',
  'Аллергии и хронические заболевания',
  'История болезней и операций',
  'Биометрия за 30 дней (пульс, давление, сон)',
  'Health Score по 5 системам',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage() {
  const { latest, reports } = await loadReportData();

  return (
    <PageShell active="home">
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="rounded-hero bg-hero-gradient p-6 mb-5 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-30 pointer-events-none">
            <Icon name="report" size={100} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
            ОТЧЁТ ВРАЧУ
          </p>
          <h1 className="text-[22px] font-extrabold text-white leading-tight mb-1">
            {latest ? `Отчёт № ${latest.reportNumber}` : 'Нет готового отчёта'}
          </h1>
          <p className="text-[12px] text-white/70 mb-4">
            {latest
              ? `Создан ${formatDate(latest.createdAt)}`
              : 'Сгенерируй сводку для врача за 30 дней'}
          </p>
          {latest ? (
            <a
              href={latest.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-chip bg-white/20 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              Скачать PDF
            </a>
          ) : (
            <GenerateReportButton />
          )}
        </section>

        {/* ── Contents ──────────────────────────────────────────────────────── */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
          Что включено в отчёт
        </p>
        <div className="rounded-card bg-white border border-border-soft p-4 mb-5 space-y-3">
          {REPORT_CONTENTS.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-bg-soft-mint flex-shrink-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-accent-mint-deep">✓</span>
              </div>
              <p className="text-[13px] text-text-primary">{item}</p>
            </div>
          ))}
        </div>

        {/* ── History ───────────────────────────────────────────────────────── */}
        {reports.length > 1 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
              Предыдущие отчёты
            </p>
            <div className="space-y-2 mb-5">
              {reports.slice(1, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3.5 rounded-card bg-white border border-border-soft">
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">
                      № {r.reportNumber}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">{formatDate(r.createdAt)}</p>
                  </div>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-chip bg-bg-soft-purple px-3 py-1.5 text-[11px] font-semibold text-accent-purple-deep hover:opacity-80 transition-opacity"
                  >
                    PDF
                  </a>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Share ─────────────────────────────────────────────────────────── */}
        {latest?.shareToken && (
          <div className="rounded-card bg-bg-soft-blue p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-white/60 flex-shrink-0 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-accent-blue-deep" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary mb-0.5">
                Ссылка для врача
              </p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Покажи врачу QR или отправь ссылку — откроется без приложения
              </p>
              <p className="text-[11px] text-text-muted mt-1 font-mono break-all">
                {`aivita.uz/r/${latest.shareToken}`}
              </p>
            </div>
          </div>
        )}

        {/* ── Generate CTA (if has reports but wants new one) ──────────────── */}
        {latest && (
          <div className="mt-4 text-center">
            <GenerateReportButton />
            <p className="text-[11px] text-text-muted mt-2">Создать новый отчёт за текущий период</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
