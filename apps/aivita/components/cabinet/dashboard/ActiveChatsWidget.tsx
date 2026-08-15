"use client";

import { useRouter } from "next/navigation";

interface Props {
  locale: string;
}

export function ActiveChatsWidget({ locale }: Props) {
  const router = useRouter();

  return (
    <section className="mx-3 mt-4 sm:mx-7">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#6a6580]">
          Сообщения и назначения
        </h3>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/chat`)}
          className="text-[11px] font-bold text-[#9c5e6c] hover:underline"
        >
          Все чаты (2) →
        </button>
      </div>

      <div
        onClick={() => router.push(`/${locale}/chat`)}
        className="group relative flex cursor-pointer items-center gap-3.5 rounded-[22px] border border-[#e8e4dc] bg-white p-3.5 shadow-card transition-all hover:border-[#f0d4dc] hover:shadow-md active:scale-[0.99]"
      >
        {/* Doctor Avatar */}
        <div className="relative flex-shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6BA3D6] to-[#4a7fb5] text-base font-bold text-white shadow-sm">
            👨‍⚕️
          </div>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-sm" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <h4 className="truncate text-xs font-black text-[#2a2540] group-hover:text-[#9c5e6c]">
              Д-р Анвар Шарипов
            </h4>
            <span className="text-[10px] font-black text-[#9c5e6c]">10:45</span>
          </div>
          <p className="truncate text-[10px] font-semibold text-[#6a6580]">
            Кардиолог · MedSoft Clinic
          </p>

          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate text-[11px] font-bold text-[#548068]">
              <span>💊</span>
              <span className="truncate">Назначение: Кардиомагнил 75 мг</span>
            </div>
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#9c5e6c] text-[10px] font-black text-white shadow-sm">
              1
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
