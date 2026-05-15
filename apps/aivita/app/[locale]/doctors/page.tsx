'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Search, X, Star } from 'lucide-react';
import { FloatingNav } from '@/components/cabinet/dashboard/FloatingNav';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

const SPECIALIZATIONS = [
  'Все', 'Кардиолог', 'Терапевт', 'Невролог', 'Эндокринолог',
  'Офтальмолог', 'Стоматолог', 'Педиатр', 'Гинеколог', 'Уролог', 'Дерматолог',
];

interface Doctor {
  userId: string;
  name: string;
  avatarUrl?: string;
  specialization?: string;
  consultationPrice?: number;
  rating?: number;
  ratingCount?: number;
  totalPatients?: number;
  bio?: string;
  city?: string;
  clinicName?: string;
  clinicAddress?: string;
  showPrice?: boolean;
  showRating?: boolean;
  photoUrl?: string;
  experienceStartDate?: string;
  additionalSkills?: string[];
  verificationStatus?: string;
}

function calcExp(dateStr?: string) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 31557600000);
}

function initials(n?: string) {
  return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function DoctorsCatalogPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams?.get('q') ?? '');
  const [spec, setSpec] = useState(searchParams?.get('specialization') ?? '');
  const [sort, setSort] = useState(searchParams?.get('sort') ?? 'rating');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async (q: string, sp: string, s: string) => {
    setLoading(true);
    const params = new URLSearchParams({ sort: s, limit: '50' });
    if (q.trim())  params.set('q', q.trim());
    if (sp && sp !== 'Все') params.set('specialization', sp);
    try {
      const res = await fetch(`${API_BASE}/v1/aivita/catalog?${params}`);
      const json = await res.json();
      // API returns [{profile:{…}, user:{name,avatarUrl}}] — normalize to flat Doctor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = json.data ?? [];
      setDoctors(raw.map(item => ({
        userId:              item.userId             ?? item.profile?.userId ?? item.user?.id ?? '',
        name:                item.name               ?? item.user?.name ?? '',
        avatarUrl:           item.avatarUrl           ?? item.user?.avatarUrl,
        specialization:      item.specialization      ?? item.profile?.specialization,
        consultationPrice:   item.consultationPrice   ?? item.profile?.consultationPrice,
        rating:              item.rating              ?? item.profile?.rating,
        ratingCount:         item.ratingCount         ?? item.profile?.ratingCount,
        totalPatients:       item.totalPatients       ?? item.profile?.totalPatients,
        bio:                 item.bio                 ?? item.profile?.bio,
        city:                item.city                ?? item.profile?.city,
        clinicName:          item.clinicName          ?? item.profile?.clinicName,
        clinicAddress:       item.clinicAddress       ?? item.profile?.clinicAddress,
        showPrice:           item.showPrice           ?? item.profile?.showPrice,
        showRating:          item.showRating          ?? item.profile?.showRating,
        photoUrl:            item.photoUrl            ?? item.profile?.photoUrl,
        experienceStartDate: item.experienceStartDate ?? item.profile?.experienceStartDate,
        additionalSkills:    item.additionalSkills    ?? item.profile?.additionalSkills,
        verificationStatus:  item.verificationStatus  ?? item.profile?.verificationStatus,
      })));
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + when filters change
  useEffect(() => {
    const t = setTimeout(() => fetchDoctors(query, spec, sort), 300);
    return () => clearTimeout(t);
  }, [query, spec, sort, fetchDoctors]);

  return (
    <div className="min-h-screen" style={{ background: '#f4f3ef' }}>

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(244,243,239,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-[480px] mx-auto px-4 pt-12 pb-3">
          {/* Back + title */}
          <div className="flex items-center gap-3 mb-3">
            <button type="button" onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: '#2a2540' }} />
            </button>
            <h1 className="text-[18px] font-extrabold" style={{ color: '#2a2540' }}>Врачи AIVITA</h1>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9a96a8' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Найти врача по имени..."
              className="w-full rounded-2xl border pl-9 pr-9 py-2.5 text-sm outline-none"
              style={{ borderColor: '#e8e4dc', color: '#2a2540', background: '#fff' }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4" style={{ color: '#9a96a8' }} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[#9a96a8] flex-shrink-0">Сортировка:</span>
            {(['rating', 'price', 'experience'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSort(s)}
                className="text-xs px-3 py-1 rounded-full border transition-colors flex-shrink-0"
                style={sort === s
                  ? { background: '#9c5e6c', color: '#fff', borderColor: '#9c5e6c' }
                  : { background: '#fff', color: '#6a6580', borderColor: '#e8e4dc' }}>
                {s === 'rating' ? '★ Рейтинг' : s === 'price' ? '💰 Цена' : '🏅 Стаж'}
              </button>
            ))}
          </div>

          {/* Specialization chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SPECIALIZATIONS.map(s => (
              <button key={s} type="button"
                onClick={() => setSpec(s === 'Все' ? '' : s)}
                className="flex-shrink-0 text-xs px-4 py-2 rounded-full border transition-colors whitespace-nowrap"
                style={(!spec && s === 'Все') || spec === s
                  ? { background: '#9c5e6c', color: '#fff', borderColor: '#9c5e6c' }
                  : { background: '#fff', color: '#6a6580', borderColor: '#e8e4dc' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-[480px] mx-auto px-4 pb-28 pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-dark)', borderTopColor: 'transparent' }} />
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-semibold text-[#2a2540] mb-1">Врачи не найдены</p>
            <p className="text-sm text-[#9a96a8]">Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#9a96a8] px-1">Найдено: {doctors.length} врачей</p>
            {doctors.map(doc => {
              const exp = calcExp(doc.experienceStartDate);
              const isVerified = doc.verificationStatus === 'verified';
              return (
                <Link key={doc.userId} href={`/${locale}/doctors/${doc.userId}`}>
                  <div className="bg-white rounded-2xl p-4 border border-[#e8e4dc] active:opacity-80 transition-opacity cursor-pointer">
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {doc.photoUrl || doc.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={doc.photoUrl ?? doc.avatarUrl} alt={doc.name ?? ''}
                            className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: 'linear-gradient(135deg, #6BA3D6, #3a6fa0)' }}>
                            {initials(doc.name)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-[14px] text-[#2a2540] truncate">
                              Dr. {doc.name}
                            </p>
                            <p className="text-sm text-[#6a6580] truncate">{doc.specialization ?? 'Специалист'}</p>
                          </div>
                          {isVerified && (
                            <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: '#d4dff0', color: '#4A7FB5' }}>
                              ✅ Верифицирован
                            </span>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {doc.showRating !== false && doc.rating ? (
                            <span className="flex items-center gap-1 text-xs font-semibold"
                              style={{ color: '#2a2540' }}>
                              <Star className="w-3 h-3 fill-[#fbbf24] text-[#fbbf24]" />
                              {doc.rating}
                              <span className="text-[#9a96a8] font-normal">({doc.ratingCount})</span>
                            </span>
                          ) : null}
                          {exp !== null && (
                            <span className="text-xs text-[#9a96a8]">{exp} лет опыта</span>
                          )}
                          {doc.city && (
                            <span className="text-xs text-[#9a96a8]">📍 {doc.city}</span>
                          )}
                        </div>

                        {doc.clinicName && (
                          <p className="text-[11px] text-[#9a96a8] mt-0.5 truncate">{doc.clinicName}</p>
                        )}

                        {/* Price + CTA */}
                        <div className="flex items-center justify-between mt-2.5 gap-2">
                          {doc.showPrice !== false && doc.consultationPrice ? (
                            <p className="text-[12px] font-bold" style={{ color: '#9c5e6c' }}>
                              от {doc.consultationPrice.toLocaleString()} сум
                            </p>
                          ) : <div />}
                          <div className="flex gap-1.5">
                            <span className="text-[11px] font-semibold px-3 py-1 rounded-full text-white"
                              style={{ background: 'var(--accent-dark, #9c5e6c)' }}>
                              Записаться
                            </span>
                            <span className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                              style={{ color: '#6BA3D6', borderColor: '#6BA3D6' }}>
                              💬
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <FloatingNav />
    </div>
  );
}
