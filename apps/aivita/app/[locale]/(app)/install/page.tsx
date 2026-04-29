'use client';
import { useEffect, useState } from 'react';
import { Share, MoreVertical, CheckCircle } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

export default function InstallPage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPhone|iPad|iPod/.test(ua));
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  }, []);

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader name="Установка" />
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center mb-6 shadow-pink">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-navy mb-2">Уже установлено!</h2>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            aivita запущена как приложение. Найди иконку на главном экране.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader name="Установить приложение" />

      <div className="px-5 space-y-5 pb-6">
        {/* Promo */}
        <div className="bg-gradient-to-br from-pink-50 to-blue-50 rounded-3xl border border-[rgba(236,72,153,0.1)] p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-pink-blue-mint flex items-center justify-center mx-auto mb-4 shadow-pink">
            <span className="text-3xl font-bold italic text-white font-serif">a</span>
          </div>
          <h2 className="text-xl font-semibold text-navy mb-2">Установи aivita</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Добавь на главный экран для быстрого доступа — работает как нативное приложение
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          {[
            { emoji: '⚡', text: 'Мгновенный запуск без браузера' },
            { emoji: '📴', text: 'Базовый функционал без интернета' },
            { emoji: '🔔', text: 'Push-уведомления о привычках' },
            { emoji: '📲', text: 'Полноэкранный режим без адресной строки' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white/70 backdrop-blur rounded-2xl border border-[rgba(120,160,200,0.15)] px-4 py-3">
              <span className="text-xl">{emoji}</span>
              <p className="text-sm text-navy">{text}</p>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <h3 className="font-semibold text-navy mb-4">
            {isIOS ? 'Инструкция для iOS (Safari)' : 'Инструкция для Android (Chrome)'}
          </h3>

          {isIOS ? (
            <div className="space-y-4">
              {[
                { step: '1', icon: Share, text: 'Нажми кнопку «Поделиться» внизу экрана Safari' },
                { step: '2', text: 'Прокрути вниз и выбери «На экран «Домой»»' },
                { step: '3', text: 'Нажми «Добавить» — иконка появится на главном экране' },
              ].map(({ step, text, icon: Icon }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-pink-blue-mint flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {step}
                  </div>
                  <div className="flex-1">
                    {Icon && <Icon className="w-4 h-4 text-pink-500 inline mr-1" />}
                    <span className="text-sm text-[rgb(var(--text-secondary))]">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { step: '1', icon: MoreVertical, text: 'Нажми ⋮ (меню) в правом верхнем углу Chrome' },
                { step: '2', text: 'Выбери «Установить приложение» или «Добавить на главный экран»' },
                { step: '3', text: 'Нажми «Установить» — иконка появится на главном экране' },
              ].map(({ step, text, icon: Icon }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-pink-blue-mint flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {step}
                  </div>
                  <div className="flex-1">
                    {Icon && <Icon className="w-4 h-4 text-pink-500 inline mr-1" />}
                    <span className="text-sm text-[rgb(var(--text-secondary))]">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
