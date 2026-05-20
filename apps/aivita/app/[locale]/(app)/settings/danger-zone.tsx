'use client';
import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { signOut, deleteAccount } from './actions';

export function DangerZone({ locale = 'ru' }: { locale?: string }) {
  const t = useTranslations('app.settings');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount(locale);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
    >
      {/* Sign out */}
      <form action={signOut.bind(null, locale)}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#f4f3ef]"
          style={{ borderBottom: '1px solid #f4f3ef' }}
        >
          <div
            className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--accent-light)' }}
          >
            <LogOut className="w-4 h-4" style={{ color: 'var(--accent-dark)' }} />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--accent-dark)' }}>
            {t('signOut')}
          </span>
        </button>
      </form>

      {/* Delete account */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#f4f3ef]"
        >
          <div
            className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center"
            style={{ background: '#fde8e8' }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-semibold text-red-600">{t('deleteAccount')}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
              {t('deleteAccountSub')}
            </p>
          </div>
        </button>
      ) : (
        <div className="px-4 py-4 space-y-3" style={{ background: '#fde8e8' }}>
          <p className="text-[14px] font-semibold text-red-700">{t('deleteConfirmTitle')}</p>
          <p className="text-[12px] text-red-600 leading-relaxed">
            {t('deleteConfirmDesc')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 h-9 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ border: '1px solid #e8e4dc', color: '#6a6580' }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-9 rounded-full text-[13px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: '#cc0000' }}
            >
              {deleting ? t('deleting') : t('deleteConfirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
