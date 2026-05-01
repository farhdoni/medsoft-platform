import { cookies } from 'next/headers';
import { Plus, ChevronRight, User } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { api } from '@/lib/api-client';
import { calcAge } from '@/lib/date-utils';

type FamilyMember = {
  id: string;
  memberName: string;
  memberRelation: string;
  memberBirthDate?: string | null;
};

const RELATION_EMOJI: Record<string, string> = {
  spouse: '💑',
  child: '👶',
  parent: '👩',
  sibling: '🧑',
  other: '👤',
};

export default async function FamilyPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const res = await api.family.list(sessionCookie);
  const members: FamilyMember[] =
    'data' in res ? (res.data as FamilyMember[]) : [];

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
        {members.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-navy px-1">
              Члены семьи ({members.length})
            </h2>

            {members.map((member) => {
              const age = member.memberBirthDate ? calcAge(member.memberBirthDate) : null;
              const emoji = RELATION_EMOJI[member.memberRelation] ?? '👤';

              return (
                <div
                  key={member.id}
                  className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-4 shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-pink-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-navy">{member.memberName}</span>
                        <span className="text-xs text-[rgb(var(--text-muted))]">
                          · {member.memberRelation}
                        </span>
                      </div>
                      {age !== null && (
                        <p className="text-xs text-[rgb(var(--text-muted))]">{age} лет</p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-8 text-center shadow-soft">
            <p className="text-3xl mb-3">👨‍👩‍👧‍👦</p>
            <p className="text-sm font-semibold text-navy mb-1">Семья пока пуста</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Добавь близких, чтобы следить за их здоровьем
            </p>
          </div>
        )}

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
