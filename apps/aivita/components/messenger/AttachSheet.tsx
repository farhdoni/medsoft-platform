'use client';

/**
 * Attachment chooser. Photos and documents each open a file input with its own
 * accept filter — the gallery on mobile, the file browser otherwise — while
 * geolocation asks the browser for the current position instead.
 *
 * The third slot differs by screen: a conversation offers a location pin, the
 * AI chat offers the camera, since there is nobody on the other end to meet.
 */
export function AttachSheet({
  onPickPhoto,
  onPickDocument,
  onPickLocation,
  onPickCamera,
  onClose,
}: {
  onPickPhoto: () => void;
  onPickDocument: () => void;
  onPickLocation?: () => void;
  onPickCamera?: () => void;
  onClose: () => void;
}) {
  const options = [
    {
      key: 'photo',
      label: 'Фото/видео',
      hint: 'из галереи',
      bg: '#dbeeff',
      onClick: onPickPhoto,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#4a7fb5" strokeWidth="1.8" />
          <circle cx="9" cy="10" r="1.8" stroke="#4a7fb5" strokeWidth="1.8" />
          <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" stroke="#4a7fb5" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: 'doc',
      label: 'Документ',
      hint: 'PDF, DOCX, XLSX…',
      bg: '#f0d4dc',
      onClick: onPickDocument,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 3v5h5" stroke="#9c5e6c" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="#9c5e6c" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 13h7M8.5 16.5h4" stroke="#9c5e6c" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    ...(onPickLocation
      ? [{
          key: 'geo',
          label: 'Геолокация',
          hint: 'текущая точка',
          bg: '#d8e8c0',
          onClick: onPickLocation,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" stroke="#6b8f4e" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" stroke="#6b8f4e" strokeWidth="1.8" />
            </svg>
          ),
        }]
      : []),
    ...(onPickCamera
      ? [{
          key: 'camera',
          label: 'Камера',
          hint: 'снять сейчас',
          bg: '#d8e8c0',
          onClick: onPickCamera,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="#6b8f4e" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.2" stroke="#6b8f4e" strokeWidth="1.8" />
            </svg>
          ),
        }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: 'rgba(42,37,64,.35)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Что прикрепить"
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-t-3xl p-4"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: '#e8e4dc' }} aria-hidden="true" />
        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={o.onClick}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl active:opacity-80"
              style={{ border: '1px solid #e8e4dc' }}
            >
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: o.bg }}>
                {o.icon}
              </span>
              <span className="text-xs font-semibold text-app-t1">{o.label}</span>
              <span className="text-[10px] text-app-t3">{o.hint}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ color: '#6a6580', border: '1px solid #e8e4dc' }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
