'use client';
import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { signOut, deleteAccount } from './actions';

export function DangerZone() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteAccount();
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] overflow-hidden shadow-soft">
      {/* Sign out */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-sm font-medium text-orange-600">Выйти из аккаунта</span>
        </button>
      </form>

      {/* Delete account */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-red-600">Удалить аккаунт</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">Безвозвратно удалит все данные</p>
          </div>
        </button>
      ) : (
        <div className="px-4 py-4 bg-red-50 space-y-3">
          <p className="text-sm font-semibold text-red-700">Удалить аккаунт навсегда?</p>
          <p className="text-xs text-red-600">Все данные, привычки и история будут удалены. Это нельзя отменить.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 h-9 rounded-xl border border-gray-200 text-sm text-[rgb(var(--text-secondary))] hover:bg-white transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-9 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {deleting ? 'Удаляю...' : 'Да, удалить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
