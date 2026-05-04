import { Download, Share2, Link2, Printer } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

export default function ReportPage() {
  const reportNumber = '4291-АК';
  const createdDate = '29 апреля 2026';

  return (
    <PageShell active="report">
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="Отчёт врачу"
        subtitle="Медицинская сводка за 30 дней"
        accentColor="#6e5fa0"
      />

      <div className="space-y-4 pb-8">

        {/* Report card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #d4e8d8 100%)' }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.6)' }}
            >
              <Icon3D name="report" size={30} />
            </div>
            <div>
              <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
                Медицинский отчёт
              </p>
              <p className="text-[12px]" style={{ color: '#6a6580' }}>
                № {reportNumber} · {createdDate}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              'Личные данные и антропометрия',
              'Аллергии и хронические заболевания',
              'История болезней и операций',
              'Биометрия за 30 дней (пульс, давление, сон)',
              'Health Score по 5 системам',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.7)', color: '#548068' }}
                >
                  ✓
                </span>
                <p className="text-[13px]" style={{ color: '#2a2540' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PDF preview */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
        >
          {/* Browser bar simulation */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b"
            style={{ background: '#f4f3ef', borderColor: '#e8e4dc' }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#cc8a96' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#9889c4' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#80b094' }} />
            </div>
            <p className="text-[11px] ml-2" style={{ color: '#9a96a8' }}>
              report-{reportNumber}.pdf
            </p>
          </div>

          {/* Simulated PDF */}
          <div className="p-6 space-y-4">
            <div className="text-center pb-4" style={{ borderBottom: '1px solid #e8e4dc' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9a96a8' }}>
                МЕДИЦИНСКИЙ ОТЧЁТ · AIVITA
              </p>
              <p className="text-[15px] font-bold mt-1" style={{ color: '#2a2540' }}>
                Азиз Каримов
              </p>
              <p className="text-[12px]" style={{ color: '#6a6580' }}>32 года · A+ · 178 см / 76 кг</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9c5e6c' }}>
                Аллергии
              </p>
              <div className="flex gap-2 flex-wrap">
                {['Пенициллин', 'Орехи'].map((a) => (
                  <span
                    key={a}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: '#f0d4dc', color: '#9c5e6c' }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6e5fa0' }}>
                Хронические
              </p>
              <p className="text-[13px]" style={{ color: '#2a2540' }}>Гастрит (с 2018)</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#548068' }}>
                Health Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-extrabold leading-none" style={{ color: '#2a2540' }}>87</span>
                <span className="text-[13px]" style={{ color: '#9a96a8' }}>/100</span>
                <span className="text-[12px] font-semibold" style={{ color: '#548068' }}>↑ +3</span>
              </div>
            </div>

            <div
              className="text-center pt-3"
              style={{ borderTop: '1px solid #e8e4dc' }}
            >
              <p className="text-[10px]" style={{ color: '#9a96a8' }}>
                Создан через aivita.uz · {createdDate}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Share2, label: 'Поделиться', primary: true },
            { icon: Link2, label: 'Скопировать ссылку', primary: false },
            { icon: Download, label: 'Скачать PDF', primary: false },
            { icon: Printer, label: 'Распечатать', primary: false },
          ].map(({ icon: Ico, label, primary }) => (
            <button
              key={label}
              className="flex items-center justify-center gap-2 h-12 rounded-2xl text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={
                primary
                  ? { background: '#9c5e6c', color: '#ffffff' }
                  : { background: '#ffffff', color: '#2a2540', border: '1px solid #e8e4dc' }
              }
            >
              <Ico className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* QR */}
        <div
          className="rounded-2xl p-4 flex items-start gap-4"
          style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
        >
          <span className="text-2xl flex-shrink-0">🔗</span>
          <div>
            <p className="text-[14px] font-semibold mb-0.5" style={{ color: '#2a2540' }}>
              QR-код для врача
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#6a6580' }}>
              Покажи врачу QR-код — он откроет отчёт прямо на своём телефоне без установки приложений.
            </p>
            <button
              className="text-[12px] font-bold mt-2 transition-opacity hover:opacity-70"
              style={{ color: '#9c5e6c' }}
            >
              Показать QR →
            </button>
          </div>
        </div>
      </div>
    </div>
    </PageShell>
  );
}
