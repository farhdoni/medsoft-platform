"use client";

import { Icon } from "@/components/cabinet/icons/Icon";
import type { Report } from "@/lib/cabinet-types";

export function ReportCard({ report }: { report: Report | null }) {
  if (!report) {
    return (
      <section className="rounded-card bg-white p-5 shadow-card">
        <div className="text-[13px] font-bold text-text-primary">
          Отчёт ещё не готов
        </div>
        <div className="mt-1 text-[11px] text-text-secondary">
          Соберём данные за 30 дней и пришлём уведомление.
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-card bg-white p-5 shadow-card">
      <div className="grid h-12 w-12 place-items-center rounded-card bg-bg-soft-purple">
        <Icon name="report" size={32} />
      </div>
      <div>
        <div className="text-[14px] font-bold text-text-primary">
          {report.title}
        </div>
        <div className="mt-1 text-[12px] leading-snug text-text-secondary">
          {report.body}
        </div>
      </div>
      <a
        href={report.pdfUrl}
        className="inline-flex w-fit items-center gap-1 rounded-chip border border-border-soft bg-white px-3.5 py-2 text-[12px] font-semibold text-text-primary transition hover:bg-bg-app"
      >
        Скачать PDF →
      </a>
    </section>
  );
}
