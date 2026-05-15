import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

interface DoctorPreview {
  userId: string;
  name: string;
  specialization?: string;
  rating?: number;
  photoUrl?: string;
  avatarUrl?: string;
  verificationStatus?: string;
  experienceStartDate?: string;
}

function calcExp(dateStr?: string) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 31557600000);
}

function initials(n?: string) {
  return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

async function getFeaturedDoctors(): Promise<DoctorPreview[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/catalog?sort=rating&limit=3`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function DoctorsHomeBlock({ locale = 'ru' }: { locale?: string }) {
  const doctors = await getFeaturedDoctors();
  if (doctors.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: '#fff', borderColor: '#e8e4dc' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
          🩺 Врачи AIVITA
        </h3>
        <Link href={`/${locale}/doctors`}
          className="text-[12px] font-semibold"
          style={{ color: 'var(--accent-dark, #9c5e6c)' }}>
          Все врачи →
        </Link>
      </div>

      <div className="space-y-2.5">
        {doctors.map(doc => {
          const exp = calcExp(doc.experienceStartDate);
          return (
            <Link key={doc.userId} href={`/${locale}/doctors/${doc.userId}`}>
              <div className="flex items-center gap-3 py-1 active:opacity-70 transition-opacity">
                {doc.photoUrl || doc.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.photoUrl ?? doc.avatarUrl} alt={doc.name ?? ''}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6BA3D6, #3a6fa0)' }}>
                    {initials(doc.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#2a2540' }}>
                    Dr. {doc.name}
                    {doc.verificationStatus === 'verified' && (
                      <span className="ml-1 text-[10px]" style={{ color: '#4A7FB5' }}>✅</span>
                    )}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: '#9a96a8' }}>
                    {doc.specialization}{exp ? ` · ${exp} лет` : ''}
                    {doc.rating ? ` · ★ ${doc.rating}` : ''}
                  </p>
                </div>
                <span style={{ color: '#9a96a8', fontSize: 16 }}>›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
