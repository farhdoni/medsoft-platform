'use client';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

interface DoctorCard {
  userId: string;
  name: string;
  specialization: string | null;
  photoUrl: string | null;
  rating: number;
  ratingCount: number;
  totalConsultations: number;
  likesCount: number;
  thanksCount: number;
  city: string | null;
  clinicName: string | null;
  bio: string | null;
  consultationPrice: number | null;
}

const SPECIALIZATIONS = [
  'Все', 'Терапевт', 'Кардиолог', 'Эндокринолог', 'Гастроэнтеролог', 'Невролог',
  'Офтальмолог', 'ЛОР', 'Дерматолог', 'Уролог', 'Гинеколог', 'Педиатр',
  'Хирург', 'Стоматолог', 'Психолог', 'Семейный врач',
];

function DoctorAvatar({ doc }: { doc: DoctorCard }) {
  if (doc.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={doc.photoUrl} alt={doc.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
    );
  }
  const initials = doc.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  return (
    <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg"
      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}>
      {initials}
    </div>
  );
}

export default function DoctorsSection({ locale = 'ru' }: { locale?: string }) {
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [filter, setFilter] = useState('Все');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'Все') params.set('specialization', filter);
    if (debouncedSearch) params.set('search', debouncedSearch);

    fetch(`${API_BASE}/v1/aivita/catalog?${params}`)
      .then(r => r.json())
      .then(j => {
        const items = Array.isArray(j.data) ? j.data : [];
        // Normalize: catalog returns { profile: {...}, name: string, ... }
        const normalized: DoctorCard[] = items.map((item: any) => ({
          userId: item.profile?.userId ?? item.userId,
          name: item.name ?? '',
          specialization: item.profile?.specialization ?? item.specialization ?? null,
          photoUrl: item.profile?.photoUrl ?? item.photoUrl ?? null,
          rating: item.profile?.rating ?? item.rating ?? 0,
          ratingCount: item.profile?.ratingCount ?? item.ratingCount ?? 0,
          totalConsultations: item.profile?.totalConsultations ?? item.totalConsultations ?? 0,
          likesCount: item.profile?.likesCount ?? item.likesCount ?? 0,
          thanksCount: item.profile?.thanksCount ?? item.thanksCount ?? 0,
          city: item.profile?.city ?? item.city ?? null,
          clinicName: item.profile?.clinicName ?? item.clinicName ?? null,
          bio: item.profile?.bio ?? item.bio ?? null,
          consultationPrice: item.profile?.consultationPrice ?? item.consultationPrice ?? null,
        }));
        setDoctors(normalized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter, debouncedSearch]);

  return (
    <section id="doctors" className="py-16 px-6 bg-[#f4f3ef]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-[#2a2540] text-center mb-2">Наши врачи</h2>
        <p className="text-sm text-[#6a6580] text-center mb-8">
          Верифицированные специалисты Узбекистана. AI подберёт врача по вашим данным.
        </p>

        {/* Search */}
        <div className="mb-4">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск врача по имени..."
            className="w-full px-4 py-3 rounded-2xl border border-[#e8e4dc] bg-white text-sm focus:outline-none focus:border-[color:var(--accent)]"
          />
        </div>

        {/* Specialization filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {SPECIALIZATIONS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: filter === s ? 'var(--accent-dark)' : '#fff',
                color: filter === s ? '#fff' : '#6a6580',
                border: `1px solid ${filter === s ? 'var(--accent-dark)' : '#e8e4dc'}`,
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="text-center text-[#9a96a8] py-12">
            <div className="w-8 h-8 border-[3px] border-[color:var(--accent-dark)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Загрузка...
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center text-[#9a96a8] py-12">
            Врачи по запросу не найдены
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map(doc => (
              <div key={doc.userId}
                className="bg-white border border-[#e8e4dc] rounded-2xl p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <DoctorAvatar doc={doc} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#2a2540] truncate">Dr. {doc.name}</div>
                    <div className="text-xs text-[#6a6580]">{doc.specialization || 'Специалист'}</div>
                    {doc.clinicName && <div className="text-xs text-[#9a96a8] truncate">{doc.clinicName}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#6a6580] mb-2">
                  <span>★ {(doc.rating || 0).toFixed(1)} ({doc.ratingCount})</span>
                  <span>{doc.totalConsultations} консульт.</span>
                  {doc.city && <span>📍 {doc.city}</span>}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#9a96a8] mb-3">
                  <span>❤️ {doc.likesCount}</span>
                  <span>🙏 {doc.thanksCount}</span>
                  {doc.consultationPrice && <span>💰 {doc.consultationPrice.toLocaleString()} сум</span>}
                </div>

                {doc.bio && (
                  <p className="text-xs text-[#6a6580] mb-4 line-clamp-2">{doc.bio}</p>
                )}

                <div className="flex gap-2">
                  <a href={`/${locale}/doctors/${doc.userId}`}
                    className="flex-1 py-2.5 text-white rounded-xl text-xs font-semibold text-center"
                    style={{ background: 'var(--accent-dark)' }}>
                    Подробнее
                  </a>
                  <a href={`/${locale}/chat`}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium"
                    style={{ background: '#f4f3ef', color: '#6a6580' }}>
                    Записаться
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
