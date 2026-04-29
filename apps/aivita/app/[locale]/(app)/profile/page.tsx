import Link from 'next/link';
import { ChevronLeft, AlertTriangle, Pill, Clock, FileText } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

const MOCK_ALLERGIES = [
  { name: 'Пенициллин', type: 'medication' },
  { name: 'Орехи', type: 'food' },
];

const MOCK_CHRONIC = [
  { name: 'Гастрит', year: 2018 },
];

const MOCK_HISTORY = [
  { name: 'COVID-19', year: 2022, type: 'illness' },
  { name: 'Аппендицит', year: 2019, type: 'surgery' },
  { name: 'Перелом руки', year: 2015, type: 'injury' },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen">
      <AppHeader name="Азиз" />

      <div className="px-5 space-y-4 pb-6">
        {/* Profile card */}
        <div className="bg-gradient-to-br from-blue-50 to-pink-50 rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-pink-blue-mint flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              АК
            </div>
            <div>
              <p className="font-semibold text-navy text-lg">Азиз Каримов</p>
              <p className="text-sm text-[rgb(var(--text-secondary))]">32 года · Группа A+ · 178 см / 76 кг</p>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-pink-600" />
            </div>
            <h3 className="font-semibold text-navy flex-1">Аллергии</h3>
            <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
              {MOCK_ALLERGIES.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOCK_ALLERGIES.map((a) => (
              <span
                key={a.name}
                className="px-3 py-1.5 bg-pink-50 text-pink-700 text-sm rounded-xl border border-pink-100 font-medium"
              >
                {a.name}
              </span>
            ))}
          </div>
        </div>

        {/* Chronic */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-navy flex-1">Хронические</h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {MOCK_CHRONIC.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOCK_CHRONIC.map((c) => (
              <span
                key={c.name}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-xl border border-blue-100 font-medium"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Medical history */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-navy flex-1">История</h3>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {MOCK_HISTORY.length}
            </span>
          </div>
          <div className="space-y-2">
            {MOCK_HISTORY.map((h) => (
              <div key={h.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-navy">{h.name}</span>
                <span className="text-xs text-[rgb(var(--text-muted))]">{h.year}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/report"
          className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm"
        >
          <FileText className="w-4 h-4" />
          Создать отчёт для врача
        </Link>
      </div>
    </div>
  );
}
