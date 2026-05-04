import { cookies } from 'next/headers';
import { Plus, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { api } from '@/lib/api-client';
import { calcAge } from '@/lib/date-utils';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

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

const RELATION_BG: Record<string, string> = {
  spouse: '#f0d4dc',
  child: '#d4e8d8',
  parent: '#e0d8f0',
  sibling: '#d4dff0',
  other: '#f4f3ef',
};

export default async function FamilyPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const res = await api.family.list(sessionCookie);
  const members: FamilyMember[] =
    'data' in res ? (res.data as FamilyMember[]) : [];

  return (
    <PageShell active="family">
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="Семья"
        subtitle="Здоровье близких в одном месте"
        accentColor="#9889c4"
      />

      <div className="space-y-4 pb-8">

        {/* Intro banner */}
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #d4dff0 100%)' }}
        >
          <Icon3D name="family" size={48} />
          <div>
            <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>
              Семейный круг здоровья
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#6a6580' }}>
              Следи за показателями близких, получай уведомления о важных изменениях.
            </p>
          </div>
        </div>

        {/* Members */}
        {members.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wider px-0.5" style={{ color: '#9a96a8' }}>
              Члены семьи ({members.length})
            </p>
            {members.map((member) => {
              const age = member.memberBirthDate ? calcAge(member.memberBirthDate) : null;
              const emoji = RELATION_EMOJI[member.memberRelation] ?? '👤';
              const bg = RELATION_BG[member.memberRelation] ?? '#f4f3ef';

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-2xl p-4 transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl"
                    style={{ background: bg }}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>
                      {member.memberName}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
                      {member.memberRelation}{age !== null ? ` · ${age} лет` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9a96a8' }} />
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
          >
            <p className="text-[40px] mb-3">👨‍👩‍👧‍👦</p>
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#2a2540' }}>
              Семья пока пуста
            </p>
            <p className="text-[12px]" style={{ color: '#9a96a8' }}>
              Добавь близких, чтобы следить за их здоровьем
            </p>
          </div>
        )}

        {/* Add member */}
        <button
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#ffffff', color: '#9c5e6c', border: '2px dashed #e8e4dc' }}
        >
          <Plus className="w-4 h-4" />
          Добавить члена семьи
        </button>

        {/* Invite card */}
        <div
          className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: '#f0d4dc' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.6)' }}
          >
            <Icon3D name="chat" size={24} />
          </div>
          <div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: '#2a2540' }}>
              Пригласить по ссылке
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#6a6580' }}>
              Отправь ссылку родственнику — они получат профиль, а ты получишь доступ к их показателям.
            </p>
            <button
              className="mt-2 text-[12px] font-bold transition-opacity hover:opacity-70"
              style={{ color: '#9c5e6c' }}
            >
              Создать ссылку →
            </button>
          </div>
        </div>
      </div>
    </div>
    </PageShell>
  );
}
