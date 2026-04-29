import { FileText, Download, Share2, Link2, Printer } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

export default function ReportPage() {
  const reportNumber = '4291-АК';
  const createdDate = '29 апреля 2026';

  return (
    <div className="min-h-screen">
      <AppHeader name="Отчёт врачу" />

      <div className="px-5 space-y-4 pb-6">
        {/* Report header */}
        <div className="bg-gradient-to-br from-blue-50 to-pink-50 rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-pink-blue-mint flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-navy">Медицинский отчёт</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">№ {reportNumber} · {createdDate}</p>
            </div>
          </div>
          <div className="text-xs text-[rgb(var(--text-secondary))] space-y-1">
            <p>✓ Личные данные и антропометрия</p>
            <p>✓ Аллергии и хронические заболевания</p>
            <p>✓ История болезней и операций</p>
            <p>✓ Биометрия за 30 дней (пульс, давление, сон)</p>
            <p>✓ Health Score по 5 системам</p>
          </div>
        </div>

        {/* PDF preview placeholder */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] overflow-hidden shadow-soft">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400 ml-2">report-{reportNumber}.pdf</span>
          </div>

          {/* Simulated PDF content */}
          <div className="p-6 space-y-4">
            <div className="text-center border-b border-gray-100 pb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-secondary))]">МЕДИЦИНСКИЙ ОТЧЁТ</p>
              <p className="text-sm font-semibold text-navy mt-1">Азиз Каримов</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">32 года · A+ · 178 см / 76 кг</p>
            </div>

            <div>
              <p className="text-xs font-bold text-pink-600 uppercase mb-2">Аллергии</p>
              <div className="flex gap-2">
                {['Пенициллин', 'Орехи'].map((a) => (
                  <span key={a} className="px-2 py-0.5 bg-pink-50 text-pink-700 text-xs rounded-lg border border-pink-100">{a}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-blue-600 uppercase mb-2">Хронические</p>
              <p className="text-xs text-navy">Гастрит (с 2018)</p>
            </div>

            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Health Score</p>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-light text-navy">87</div>
                <div className="text-xs text-[rgb(var(--text-muted))]">/ 100</div>
                <div className="text-xs text-emerald-600 font-medium">↑ +3</div>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-300">Создан через aivita.uz · {createdDate}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Share2, label: 'Поделиться', primary: true },
            { icon: Link2, label: 'Скопировать ссылку', primary: false },
            { icon: Download, label: 'Скачать PDF', primary: false },
            { icon: Printer, label: 'Распечатать', primary: false },
          ].map(({ icon: Icon, label, primary }) => (
            <button
              key={label}
              className={`flex items-center justify-center gap-2 h-12 rounded-2xl text-sm font-medium transition-all ${
                primary
                  ? 'bg-gradient-pink-blue-mint text-white shadow-pink hover:shadow-pink-strong'
                  : 'bg-white/80 backdrop-blur border border-[rgba(120,160,200,0.2)] text-navy hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* QR note */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 flex items-start gap-3">
          <span className="text-2xl">🔗</span>
          <div>
            <p className="text-sm font-medium text-navy">QR-код для врача</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">
              Покажи врачу QR-код — он откроет отчёт прямо на своём телефоне без установки приложений.
            </p>
            <button className="text-xs text-pink-500 font-semibold mt-2">
              Показать QR →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
