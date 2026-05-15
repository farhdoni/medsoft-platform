import { BookingButton } from '@/components/doctors/BookingButton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

interface DoctorPublicData {
  profile: {
    specialization?: string;
    bio?: string;
    city?: string;
    clinicName?: string;
    clinicAddress?: string;
    photoUrl?: string;
    experienceStartDate?: string;
    consultationPrice?: number;
    rating?: number;
    ratingCount?: number;
    totalConsultations?: number;
    totalPatients?: number;
    likesCount?: number;
    languages?: string[];
    showPrice?: boolean;
    showRating?: boolean;
    additionalSkills?: string[];
    verificationStatus?: string;
  };
  name: string;
  reviews?: Array<{
    id: string;
    rating: number;
    text?: string;
    createdAt: string;
    reviewer?: { name: string } | null;
    isAnonymous?: boolean;
  }>;
}

function calcExp(dateStr?: string) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 31557600000);
}

export default async function PublicDoctorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  let data: DoctorPublicData | null = null;
  let reviews: DoctorPublicData['reviews'] = [];

  try {
    const [docRes, revRes] = await Promise.all([
      fetch(`${API_BASE}/v1/aivita/catalog/${id}`, { cache: 'no-store' }),
      fetch(`${API_BASE}/v1/aivita/catalog/${id}/reviews`, { cache: 'no-store' }),
    ]);
    if (docRes.ok) {
      const j = await docRes.json();
      data = j.data ? { profile: j.data.profile, name: j.data.user?.name ?? '' } : null;
    }
    if (revRes.ok) {
      const j = await revRes.json();
      reviews = j.data ?? [];
    }
  } catch {}

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">👤</div>
          <h1 className="text-xl font-bold text-[#2a2540] mb-2">Врач не найден</h1>
          <a href={`/${locale}/doctors`} className="text-sm text-[color:var(--accent-dark)] underline">← Каталог врачей</a>
        </div>
      </div>
    );
  }

  const p = data.profile;
  const expYears = calcExp(p.experienceStartDate);
  const initials = data.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const avgRating = (reviews ?? []).length
    ? ((reviews ?? []).reduce((s, r) => s + (r.rating || 0), 0) / (reviews ?? []).length).toFixed(1)
    : (p.rating ?? 0).toFixed(1);
  const isVerified = p.verificationStatus === 'verified';

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* Header */}
      <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--accent-dark))' }}>
        <a href={`/${locale}/doctors`} className="text-white/70 text-sm mb-4 block">← Каталог врачей</a>
        <div className="flex items-center gap-4">
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl} alt={data.name} className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">Dr. {data.name}</h1>
              {isVerified && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#d4dff0', color: '#4A7FB5' }}>
                  ✅ Верифицирован
                </span>
              )}
            </div>
            <p className="text-white/80 text-sm">{p.specialization || 'Специалист'}</p>
            {p.city && <p className="text-white/70 text-xs mt-0.5">📍 {p.city}</p>}
            {p.clinicName && <p className="text-white/70 text-xs">{p.clinicName}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-32">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 mb-4">
          {p.showRating !== false && (
            <div className="bg-white rounded-2xl p-4 text-center border border-[#e8e4dc]">
              <div className="text-xl font-bold text-[#2a2540]">★ {avgRating}</div>
              <div className="text-xs text-[#9a96a8]">{p.ratingCount ?? (reviews ?? []).length} отзывов</div>
            </div>
          )}
          {expYears !== null && (
            <div className="bg-white rounded-2xl p-4 text-center border border-[#e8e4dc]">
              <div className="text-xl font-bold text-[#2a2540]">{expYears}</div>
              <div className="text-xs text-[#9a96a8]">лет опыта</div>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 text-center border border-[#e8e4dc]">
            <div className="text-xl font-bold text-[#2a2540]">{p.totalPatients ?? 0}</div>
            <div className="text-xs text-[#9a96a8]">пациентов</div>
          </div>
        </div>

        {/* Bio */}
        {p.bio && (
          <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-2 text-sm">О враче</h3>
            <p className="text-sm text-[#6a6580] leading-relaxed">{p.bio}</p>
          </div>
        )}

        {/* Skills */}
        {p.additionalSkills && p.additionalSkills.length > 0 && (
          <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-2 text-sm">Навыки</h3>
            <div className="flex gap-2 flex-wrap">
              {p.additionalSkills.map(skill => (
                <span key={skill} className="text-xs px-3 py-1 rounded-full"
                  style={{ background: 'var(--accent-bg, #f0d4dc)', color: 'var(--accent-dark, #9c5e6c)' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {p.languages && p.languages.length > 0 && (
          <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-2 text-sm">Языки</h3>
            <div className="flex gap-2 flex-wrap">
              {p.languages.map(lang => (
                <span key={lang} className="text-xs px-3 py-1 rounded-full"
                  style={{ background: 'var(--accent-bg)', color: 'var(--accent-dark)' }}>
                  {lang === 'ru' ? '🇷🇺 Русский' : lang === 'uz' ? '🇺🇿 Узбекский' : lang === 'en' ? '🇬🇧 English' : lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinic */}
        {(p.clinicName || p.clinicAddress) && (
          <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-2 text-sm">Место приёма</h3>
            {p.clinicName && <p className="text-sm font-semibold text-[#2a2540]">{p.clinicName}</p>}
            {p.clinicAddress && <p className="text-sm text-[#6a6580] mt-0.5">📍 {p.clinicAddress}</p>}
          </div>
        )}

        {/* Reviews */}
        {(reviews ?? []).length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-[#e8e4dc] mb-4">
            <h3 className="font-semibold text-[#2a2540] mb-4 text-sm">Отзывы ({(reviews ?? []).length})</h3>
            <div className="space-y-3">
              {(reviews ?? []).slice(0, 5).map(r => (
                <div key={r.id} className="pb-3 border-b border-[#f4f3ef] last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#2a2540]">
                      {r.isAnonymous ? 'Анонимно' : (r.reviewer?.name ?? 'Пациент')}
                    </span>
                    <span className="text-xs text-[#9a96a8]">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.text && <p className="text-xs text-[#6a6580]">{r.text}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center">
        <div className="max-w-xl w-full px-4 pb-6 pt-3"
          style={{ background: 'rgba(244,243,239,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e8e4dc' }}>
          {p.showPrice !== false && p.consultationPrice ? (
            <p className="text-sm text-[#6a6580] mb-3 text-center">
              💰 Консультация: <span className="font-bold text-[#2a2540]">{p.consultationPrice.toLocaleString()} сум</span>
            </p>
          ) : null}
          <div className="flex gap-2">
            <BookingButton doctorId={id} doctorName={data.name} locale={locale} />
            <a href={`/${locale}/chats/start?doctorId=${id}`}
              className="flex-1 py-3 text-sm font-semibold rounded-2xl text-center border-2"
              style={{ color: '#6BA3D6', borderColor: '#6BA3D6', background: '#fff' }}>
              💬 Написать
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
