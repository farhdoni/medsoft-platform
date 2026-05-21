'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { ALL_NAV_ITEMS } from '@/components/doctor/DoctorBottomNav';

const STORAGE_KEY = 'doctor-nav-config';
const DEFAULT_PINNED = ['home', 'patients', 'schedule', 'chats'];
const MAX_PINNED = 4;

export function NavigationSettingsClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(DEFAULT_PINNED);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown[];
        if (Array.isArray(arr)) {
          const valid = arr
            .filter((id): id is string => typeof id === 'string')
            .filter(id => ALL_NAV_ITEMS.some(item => item.id === id))
            .slice(0, MAX_PINNED);
          if (valid.length > 0) setSelected(valid);
        }
      }
    } catch {}
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) {
        // Don't allow deselecting if only 1 left
        if (prev.length <= 1) return prev;
        return prev.filter(x => x !== id);
      }
      // Don't allow more than MAX_PINNED
      if (prev.length >= MAX_PINNED) return prev;
      return [...prev, id];
    });
    setSaved(false);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    // Trigger storage event for other tabs/components
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const selectedCount = selected.length;
  const canAddMore = selectedCount < MAX_PINNED;

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100"
        style={{ boxShadow: '0 1px 8px rgba(42,37,64,0.06)' }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Настройки навигации</h1>
          <p className="text-[11px] text-gray-400">Выберите 4 раздела для бара</p>
        </div>
        <button
          onClick={save}
          className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
          style={{
            background: saved
              ? '#4CAF50'
              : 'linear-gradient(135deg, #5580b0, #6BA3D6)',
            boxShadow: '0 4px 12px rgba(107,163,214,0.35)',
          }}
        >
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      {/* Counter */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm"
          style={{ background: 'rgba(107,163,214,0.08)', border: '1px solid rgba(107,163,214,0.2)' }}
        >
          <span className="text-gray-600 font-medium">Выбрано позиций</span>
          <span className="font-bold" style={{ color: '#5580b0' }}>
            {selectedCount} / {MAX_PINNED}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 px-1">
          5-я иконка всегда «Ещё» — там будут остальные разделы
        </p>
      </div>

      {/* Items */}
      <div className="px-4 pb-24 grid grid-cols-1 gap-2 mt-2">
        {ALL_NAV_ITEMS.map(item => {
          const isSelected = selected.includes(item.id);
          const isDisabled = !isSelected && !canAddMore;
          const orderIndex = isSelected ? selected.indexOf(item.id) + 1 : null;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && toggle(item.id)}
              disabled={isDisabled}
              className="flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]"
              style={{
                background: isSelected
                  ? 'rgba(107,163,214,0.08)'
                  : isDisabled
                    ? '#f8f8f8'
                    : '#ffffff',
                borderColor: isSelected
                  ? '#6BA3D6'
                  : '#eeece8',
                opacity: isDisabled ? 0.45 : 1,
                boxShadow: isSelected ? '0 2px 8px rgba(107,163,214,0.15)' : 'none',
              }}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <Icon3D name={item.icon} size={40} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold"
                  style={{ color: isSelected ? '#5580b0' : '#2a2540' }}
                >
                  {item.label}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
              </div>

              {/* Order badge or checkbox */}
              <div className="flex-shrink-0 ml-2">
                {isSelected ? (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#6BA3D6' }}
                  >
                    {orderIndex}
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: '#dde8f0' }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fixed bottom bar with preview */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 pt-3 pb-5"
        style={{ boxShadow: '0 -4px 16px rgba(42,37,64,0.08)' }}
      >
        <p className="text-[11px] text-gray-400 text-center mb-2">Предпросмотр бара</p>
        <div className="flex items-center justify-center gap-1">
          {selected.map(id => {
            const item = ALL_NAV_ITEMS.find(i => i.id === id);
            if (!item) return null;
            return (
              <div
                key={id}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(107,163,214,0.10)', minWidth: 54 }}
              >
                <Icon3D name={item.icon} size={22} />
                <span className="text-[9px] font-semibold text-[#5580b0] whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            );
          })}
          {/* Always show Ещё */}
          <div
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full"
            style={{ minWidth: 54 }}
          >
            <span className="text-[20px] leading-none text-gray-400">⋯</span>
            <span className="text-[9px] font-semibold text-gray-400">Ещё</span>
          </div>
        </div>
      </div>
    </div>
  );
}
