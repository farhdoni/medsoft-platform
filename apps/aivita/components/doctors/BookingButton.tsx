'use client';
import { useState } from 'react';
import { BookingModal } from './BookingModal';

interface BookingButtonProps {
  doctorId: string;
  doctorName: string;
  clinicId?: string; // добавил clinicId
  locale?: string;
}

export function BookingButton({ doctorId, doctorName, clinicId, locale = 'ru' }: BookingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 py-3 text-white text-sm font-semibold rounded-2xl text-center"
        style={{ background: 'var(--accent-dark)' }}
      >
        📅 Записаться
      </button>

      {open && (
        <BookingModal
          doctorId={doctorId}
          doctorName={doctorName}
          clinicId={clinicId || ''} // Передаем clinicId
          locale={locale}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
