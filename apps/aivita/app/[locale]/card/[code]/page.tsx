const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

interface CardData {
  name: string;
  bloodGroup: string;
  allergies: string;
  chronicDiseases: string;
  currentMedications: string;
  emergencyContactName: string;
  emergencyContactPhone: string | null;
}

export default async function MedicalCardPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  let data: CardData | null = null;

  try {
    const res = await fetch(`${API_BASE}/v1/aivita/card/${code}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      data = json.data;
    }
  } catch {}

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-[#2a2540] mb-2">Карта не найдена</h1>
          <p className="text-sm text-[#9a96a8]">Медкарта деактивирована или не существует</p>
          <a href="https://aivita.uz" className="text-xs text-[color:var(--accent-dark)] font-semibold mt-3 block">
            aivita.uz
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 text-white text-center"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-mid))' }}>
          <div className="text-3xl mb-2">🏥</div>
          <h1 className="text-lg font-bold">{data.name}</h1>
          <p className="text-xs opacity-70 mt-1">Медицинская карта · Aivita</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-[#e8e4dc]">
            <span className="text-sm text-[#6a6580]">🩸 Группа крови</span>
            <span className="text-sm font-semibold text-[#2a2540]">{data.bloodGroup}</span>
          </div>
          <div className="flex items-start justify-between py-3 border-b border-[#e8e4dc] gap-4">
            <span className="text-sm text-[#6a6580] shrink-0">⚠️ Аллергии</span>
            <span className="text-sm font-semibold text-red-600 text-right">{data.allergies}</span>
          </div>
          <div className="flex items-start justify-between py-3 border-b border-[#e8e4dc] gap-4">
            <span className="text-sm text-[#6a6580] shrink-0">🏥 Хронические</span>
            <span className="text-sm font-semibold text-[#2a2540] text-right">{data.chronicDiseases}</span>
          </div>
          <div className="flex items-start justify-between py-3 border-b border-[#e8e4dc] gap-4">
            <span className="text-sm text-[#6a6580] shrink-0">💊 Препараты</span>
            <span className="text-sm font-semibold text-[#2a2540] text-right">{data.currentMedications}</span>
          </div>
          <div className="flex items-center justify-between py-3 gap-4">
            <span className="text-sm text-[#6a6580] shrink-0">📞 Контакт</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-[#2a2540]">{data.emergencyContactName}</div>
              {data.emergencyContactPhone && (
                <a href={`tel:${data.emergencyContactPhone}`}
                  className="text-xs text-[color:var(--accent-dark)] underline">{data.emergencyContactPhone}</a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f4f3ef] p-4 text-center">
          <p className="text-xs text-[#9a96a8]">
            Полная информация доступна авторизованным врачам
          </p>
          <a href="https://aivita.uz" className="text-xs text-[color:var(--accent-dark)] font-semibold mt-1 block">
            aivita.uz
          </a>
        </div>
      </div>
    </div>
  );
}
