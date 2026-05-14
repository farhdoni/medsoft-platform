'use client';

import { useState } from 'react';
import { Download, Printer, Share2, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ReportRecord } from './data';
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

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  latest: ReportRecord | null;
  reports: ReportRecord[];
  cardCode: string | null;
}

export function ReportClient({ latest, reports, cardCode }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareCode = latest?.shareToken ?? latest?.id ?? null;
  const shareUrl = latest?.shareToken
    ? `https://aivita.uz/r/${latest.shareToken}`
    : latest
    ? `https://aivita.uz/report/${latest.id}`
    : null;
  const pdfFilename = latest
    ? `AIVITA-Report-${latest.reportNumber}.pdf`
    : 'AIVITA-Report.pdf';

  async function handlePDF() {
    if (!latest) return;
    setPdfLoading(true);
    try {
      const { generateReportPDF } = await import('@/lib/generate-pdf');
      await generateReportPDF('report-content', pdfFilename);
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const url = shareUrl ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Мой медицинский отчёт — Aivita', url });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div id="report-content">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section
          className="rounded-3xl p-6 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)' }}
        >
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ОТЧЁТ ВРАЧУ
          </p>
          <h1 className="text-[22px] font-extrabold text-white leading-tight mb-0.5">
            {latest ? `Отчёт № ${latest.reportNumber}` : 'Нет готового отчёта'}
          </h1>

          {/* ── Медкарта ── */}
          {cardCode && (
            <p className="text-[12px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Медкарта: {cardCode}
            </p>
          )}

          <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {latest
              ? `Создан ${formatDate(latest.createdAt)}`
              : 'Сгенерируй сводку для врача за 30 дней'}
          </p>

          {latest ? (
            <div className="flex flex-wrap gap-2 no-print">
              {/* PDF */}
              <button
                onClick={handlePDF}
                disabled={pdfLoading}
                suppressHydrationWarning
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {pdfLoading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" aria-hidden="true" />
                )}
                {pdfLoading ? 'Генерирую...' : 'Скачать PDF'}
              </button>

              {/* Печать */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                Печать
              </button>

              {/* Поделиться */}
              <button
                onClick={handleShare}
                suppressHydrationWarning
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Share2 className="w-3.5 h-3.5" aria-hidden="true" />}
                {copied ? 'Скопировано!' : 'Поделиться'}
              </button>
            </div>
          ) : (
            <div className="no-print">
              <GenerateReportButton />
            </div>
          )}
        </section>

        {/* ── Contents ──────────────────────────────────────────────────────── */}
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>
          Что включено в отчёт
        </p>
        <div className="rounded-2xl bg-white border p-4 mb-5 space-y-3" style={{ borderColor: '#e8e4dc' }}>
          {REPORT_CONTENTS.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: '#d4e8d8' }}
              >
                <span className="text-[10px] font-bold" style={{ color: '#2a7040' }}>✓</span>
              </div>
              <p className="text-[13px]" style={{ color: '#2a2540' }}>{item}</p>
            </div>
          ))}
        </div>

        {/* ── QR + Share ────────────────────────────────────────────────────── */}
        {shareCode && shareUrl && (
          <div className="rounded-2xl p-4 mb-5 flex items-start gap-4" style={{ background: '#e8e4f8', border: '1px solid #d4ccf0' }}>
            {/* QR */}
            <div
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl flex-shrink-0"
              style={{ background: '#ede9f8' }}
            >
              <QRCodeSVG
                value={shareUrl}
                size={110}
                fgColor="#2a2540"
                bgColor="transparent"
                level="M"
              />
              <p className="text-[9px] font-mono text-center" style={{ color: '#9a96a8', maxWidth: 110, wordBreak: 'break-all' }}>
                aivita.uz/r/{shareCode}
              </p>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[13px] font-semibold mb-1" style={{ color: '#2a2540' }}>
                Ссылка для врача
              </p>
              <p className="text-[12px] leading-relaxed mb-2" style={{ color: '#6a6580' }}>
                Покажи врачу QR или отправь ссылку — откроется без приложения
              </p>
              <p className="text-[11px] font-mono break-all" style={{ color: '#9a96a8' }}>
                aivita.uz/r/{shareCode}
              </p>
            </div>
          </div>
        )}

        {/* ── History ───────────────────────────────────────────────────────── */}
        {reports.length > 1 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>
              Предыдущие отчёты
            </p>
            <div className="space-y-2 mb-5">
              {reports.slice(1, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white border"
                  style={{ borderColor: '#e8e4dc' }}
                >
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
                      № {r.reportNumber}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
                      {formatDate(r.createdAt)}
                      {cardCode && (
                        <span className="ml-2 font-mono" style={{ color: '#b0acbc' }}>{cardCode}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handlePDF}
                    className="rounded-full px-3 py-1.5 text-[11px] font-semibold no-print transition hover:opacity-80"
                    style={{ background: '#ede9f8', color: '#5e40a0' }}
                  >
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Generate CTA ──────────────────────────────────────────────────── */}
        {latest && (
          <div className="mt-4 text-center no-print">
            <GenerateReportButton />
            <p className="text-[11px] mt-2" style={{ color: '#9a96a8' }}>
              Создать новый отчёт за текущий период
            </p>
          </div>
        )}
    </div>
  );
}
