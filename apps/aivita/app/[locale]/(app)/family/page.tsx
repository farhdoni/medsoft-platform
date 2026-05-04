import { Plus, ChevronRight, Shield } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import { calcAge } from '@/lib/date-utils';
import { loadFamilyData } from './data';

// ─── Config ───────────────────────────────────────────────────────────────────

const RELATION_LABELS: Record<string, string> = {
  spouse: 'Супруг/а', child: 'Ребёнок', parent: 'Родитель',
  sibling: 'Брат/Сестра', other: 'Другое',
};

const SOFT_BGS = [
  'bg-bg-soft-pink', 'bg-bg-soft-purple', 'bg-bg-soft-mint',
  'bg-bg-soft-blue', 'bg-bg-soft-sage',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FamilyPage() {
  const { members } = await loadFamilyData();

  return (
    <PageShell active="family">
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="rounded-hero bg-hero-gradient p-6 mb-5 flex items-center gap-5">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">СЕМЬЯ</p>
            <p className="text-[22px] font-extrabold text-white leading-tight">
              {members.length === 0
                ? 'Пригласи близких'
                : `${members.length} ${members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}`}
            </p>
            <p className="text-[12px] text-white/70 mt-1">
              Здоровье близких в одном месте
            </p>
          </div>
          <div className="flex-shrink-0">
            <Icon name="family" size={56} />
          </div>
        </section>

        {/* ── Members ───────────────────────────────────────────────────────── */}
        {members.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
              Члены семьи
            </p>
            <div className="space-y-2 mb-5">
              {members.map((m, idx) => {
                const age = m.memberBirthDate ? calcAge(m.memberBirthDate) : null;
                const relation = RELATION_LABELS[m.memberRelation] ?? m.memberRelation;
                const initial = m.memberName.charAt(0).toUpperCase();
                const bg = SOFT_BGS[idx % SOFT_BGS.length];
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 p-4 rounded-card bg-white border border-border-soft hover:bg-bg-app transition-colors cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center text-[18px] font-bold text-text-primary ${bg}`}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-text-primary">{m.memberName}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {relation}{age !== null ? ` · ${age} лет` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center mb-5">
            <div className="w-20 h-20 rounded-[24px] bg-bg-soft-purple flex items-center justify-center">
              <Icon name="family" size={40} />
            </div>
            <p className="text-[15px] font-semibold text-text-primary">Семья пока пуста</p>
            <p className="text-[13px] text-text-muted max-w-[220px] leading-relaxed">
              Добавь близких, чтобы следить за их здоровьем в одном месте
            </p>
          </div>
        )}

        {/* ── Add button ─────────────────────────────────────────────────────── */}
        <button className="w-full flex items-center justify-center gap-2 h-12 rounded-card bg-white text-[13px] font-semibold text-accent-rose border-2 border-dashed border-border-soft hover:bg-bg-app transition-colors mb-4">
          <Plus className="w-4 h-4" />
          Добавить члена семьи
        </button>

        {/* ── Privacy reminder ───────────────────────────────────────────────── */}
        <div className="rounded-card bg-bg-soft-pink p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-white/60 flex-shrink-0 flex items-center justify-center">
            <Shield className="w-4 h-4 text-accent-rose" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text-primary mb-0.5">Что видит семья</p>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Общие метрики (Health Score, шаги). <strong>Не видят:</strong> AI-чат, мед. документы, заметки.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
