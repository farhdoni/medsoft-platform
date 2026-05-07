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
  };
  name: string;
  reviews?: Array<{
    id: string;
    rating: number;
    text?: string;
    createdAt: string;
    reviewer?: { name: string };
  }>;
}

function calcExp(dateStr?: string) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 31557600000);
}

export default async function PublicDoctorPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale, id } = params;
  let data: DoctorPublicData | null = null;
  let reviews: DoctorPublicData['reviews'] = [];

  try {
    const [docRes, revRes] = await Promise.all([
      fetch(`${API_BASE}/v1/aivita/catalog/${id}`, { cache: 'no-store' }),
      fetch(`${API_BASE}/v1/aivita/doctor/reviews/doctor/${id}`, { cache: 'no-store' }),
    ]);
    if (docRes.ok) {
      const j = await docRes.json();
      data = j.data;
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
          <a href={`/${locale}`} className="text-sm text-[#6e5fa0] underline">На главную</a>
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

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* Header */}
      <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
        <a href={`/${locale}`} className="text-white/70 text-sm mb-4 block">← Назад</a>
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
            <h1 className="text-xl font-bold">Dr. {data.name}</h1>
            <p className="text-white/80 text-sm">{p.specialization || 'Специалист'}</p>
            {p.city && <p className="text-white/70 text-xs mt-0.5">📍 {p.city}</p>}
            {p.clinicName && <p className="text-white/70 text-xs">{p.clinicName}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-8">
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

        {/* Price + CTA */}
        <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
          {p.showPrice !== false && p.consultationPrice && (
            <p className="text-sm text-[#6a6580] mb-3">
              💰 Консультация: <span className="font-bold text-[#2a2540]">{p.consultationPrice.toLocaleString()} сум</span>
            </p>
          )}
          <a href={`/${locale}/chat`}
            className="block w-full py-3 text-white text-sm font-semibold rounded-2xl text-center"
            style={{ background: '#6e5fa0' }}>
            Записаться на приём
          </a>
        </div>

        {/* Bio */}
        {p.bio && (
          <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-2 text-sm">О враче</h3>
            <p className="text-sm text-[#6a6580] leading-relaxed">{p.bio}</p>
          </div>
        )}

        {/* Languages */}
        {p.languages && p.languages.length > 0 && (
          <div className="bg-white rounded-2xl p-5 mb-4 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-2 text-sm">Языки</h3>
            <div className="flex gap-2 flex-wrap">
              {p.languages.map(lang => (
                <span key={lang} className="text-xs px-3 py-1 rounded-full"
                  style={{ background: '#e8e4f0', color: '#6e5fa0' }}>
                  {lang === 'ru' ? '🇷🇺 Русский' : lang === 'uz' ? '🇺🇿 Узбекский' : lang === 'en' ? '🇬🇧 English' : lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {(reviews ?? []).length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-[#e8e4dc]">
            <h3 className="font-semibold text-[#2a2540] mb-4 text-sm">Отзывы ({(reviews ?? []).length})</h3>
            <div className="space-y-3">
              {(reviews ?? []).slice(0, 5).map(r => (
                <div key={r.id} className="pb-3 border-b border-[#f4f3ef] last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#2a2540]">
                      {r.reviewer?.name ?? 'Пациент'}
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
    </div>
  );
}
