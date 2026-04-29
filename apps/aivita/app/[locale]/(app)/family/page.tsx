import { Plus, AlertCircle, ChevronRight, User } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

const FAMILY_MEMBERS = [
  {
    id: '1',
    name: 'Мать',
    relation: 'Мама',
    age: 58,
    emoji: '👩',
    score: 74,
    alert: '⚠️ Давление 145/90 — выше нормы',
    hasAlert: true,
  },
  {
    id: '2',
    name: 'Сардор',
    relation: 'Сын',
    age: 8,
    emoji: '👦',
    score: 91,
    alert: null,
    hasAlert: false,
  },
];

export default function FamilyPage() {
  return (
    <div className="min-h-screen">
      <AppHeader name="Семья" />

      <div className="px-5 space-y-4 pb-6">
        {/* Header info */}
        <div className="bg-gradient-to-br from-blue-50 to-pink-50 rounded-3xl border border-[rgba(120,160,200,0.15)] p-4">
          <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
            Следи за здоровьем близких в одном месте. Получай уведомления о важных показателях.
          </p>
        </div>

        {/* Members */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-navy px-1">Члены семьи ({FAMILY_MEMBERS.length})</h2>

          {FAMILY_MEMBERS.map((member) => (
            <div
              key={member.id}
              className={`bg-white/80 backdrop-blur-xl rounded-2xl border p-4 shadow-soft ${
                member.hasAlert ? 'border-orange-200 bg-orange-50/40' : 'border-[rgba(120,160,200,0.15)]'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-pink-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {member.emoji}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-navy">{member.name}</span>
                    <span className="text-xs text-[rgb(var(--text-muted))]">· {member.relation}</span>
                  </div>
                  <p className="text-xs text-[rgb(var(--text-muted))]">{member.age} лет</p>
                  {member.hasAlert && member.alert && (
                    <div className="flex items-start gap-1 mt-2">
                      <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700 leading-relaxed">{member.alert}</p>
                    </div>
                  )}
                </div>

                {/* Score + arrow */}
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-sm font-bold ${member.score >= 80 ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {member.score}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add member */}
        <button className="w-full flex items-center justify-center gap-2 h-12 bg-white/80 backdrop-blur border border-dashed border-[rgba(120,160,200,0.3)] text-[rgb(var(--text-secondary))] rounded-2xl text-sm hover:bg-white transition-all">
          <Plus className="w-4 h-4" />
          Добавить члена семьи
        </button>

        {/* Invite card */}
        <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-3xl border border-[rgba(236,72,153,0.1)] p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy mb-1">Пригласить по ссылке</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">
                Отправь ссылку родственнику — они получат профиль, а ты — доступ к их показателям.
              </p>
              <button className="mt-2 text-xs text-pink-500 font-semibold">
                Создать ссылку →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
