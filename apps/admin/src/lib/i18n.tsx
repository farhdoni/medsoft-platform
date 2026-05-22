'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'ru' | 'en' | 'uz';

export const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { value: 'en', label: 'English',    flag: '🇺🇸' },
  { value: 'uz', label: "O'zbekcha",  flag: '🇺🇿' },
];

const translations = {
  ru: {
    // Sidebar nav
    nav: {
      dashboard:    'Дашборд',
      patients:     'Пациенты',
      doctors:      'Врачи',
      clinics:      'Клиники',
      appointments: 'Приёмы',
      transactions: 'Транзакции',
      finance:      'Финансы',
      sosCalls:     'SOS вызовы',
      monitoring:   'Мониторинг',
      cms:          'CMS лендинга',
      admins:       'Админы',
      account:      'Мой аккаунт',
      logout:       'Выйти',
    },
    sections: {
      aivita:    'AIVITA',
      users:     'ПОЛЬЗОВАТЕЛИ',
      partners:  'ПАРТНЁРЫ',
      marketing: 'МАРКЕТИНГ',
      content:   'КОНТЕНТ',
      security:  'БЕЗОПАСНОСТЬ',
      reports:   'ОТЧЁТЫ',
      system:    'СИСТЕМА',
      settings:  'НАСТРОЙКИ',
    },
    // Account page
    account: {
      title:         'Мой аккаунт',
      subtitle:      'Управляйте профилем и настройками',
      profile:       'Профиль',
      profileDesc:   'Ваше имя, email и аватар',
      avatar:        'Аватар',
      changePhoto:   'Изменить фото',
      removePhoto:   'Удалить',
      fullName:      'Полное имя',
      email:         'Email',
      saveProfile:   'Сохранить',
      saving:        'Сохранение...',
      saved:         'Сохранено!',
      appearance:    'Внешний вид',
      appearanceDesc:'Тема и язык интерфейса',
      theme:         'Тема',
      themeLight:    'Светлая',
      themeDark:     'Тёмная',
      themeSystem:   'Системная',
      language:      'Язык интерфейса',
      security:      'Безопасность',
      securityDesc:  'Пароль и двухфакторная аутентификация',
      changePassword:'Изменить пароль',
      currentPwd:    'Текущий пароль',
      newPwd:        'Новый пароль',
      confirmPwd:    'Повторите пароль',
      updatePwd:     'Обновить пароль',
      updating:      'Обновление...',
      twoFactor:     'Двухфакторная аутентификация',
      twoFactorDesc: 'Дополнительная защита через TOTP-приложение',
      twoFactorOn:   'Включена',
      twoFactorOff:  'Отключена',
      setup2fa:      'Включить 2FA',
      disable2fa:    'Отключить 2FA',
      sessions:      'Активные сессии',
      sessionsDesc:  'Устройства, с которых выполнен вход',
    },
    errors: {
      nameTooShort:  'Имя должно быть не менее 2 символов',
      pwdTooShort:   'Пароль должен быть не менее 6 символов',
      pwdMismatch:   'Пароли не совпадают',
      updateFailed:  'Ошибка при обновлении',
      pwdWrong:      'Неверный текущий пароль',
    },
  },
  en: {
    nav: {
      dashboard:    'Dashboard',
      patients:     'Patients',
      doctors:      'Doctors',
      clinics:      'Clinics',
      appointments: 'Appointments',
      transactions: 'Transactions',
      finance:      'Finance',
      sosCalls:     'SOS Calls',
      monitoring:   'Monitoring',
      cms:          'Landing CMS',
      admins:       'Admins',
      account:      'My Account',
      logout:       'Log out',
    },
    sections: {
      aivita:    'AIVITA',
      users:     'USERS',
      partners:  'PARTNERS',
      marketing: 'MARKETING',
      content:   'CONTENT',
      security:  'SECURITY',
      reports:   'REPORTS',
      system:    'SYSTEM',
      settings:  'SETTINGS',
    },
    account: {
      title:         'My Account',
      subtitle:      'Manage your profile and preferences',
      profile:       'Profile',
      profileDesc:   'Your name, email and avatar',
      avatar:        'Avatar',
      changePhoto:   'Change photo',
      removePhoto:   'Remove',
      fullName:      'Full name',
      email:         'Email',
      saveProfile:   'Save',
      saving:        'Saving...',
      saved:         'Saved!',
      appearance:    'Appearance',
      appearanceDesc:'Theme and interface language',
      theme:         'Theme',
      themeLight:    'Light',
      themeDark:     'Dark',
      themeSystem:   'System',
      language:      'Language',
      security:      'Security',
      securityDesc:  'Password and two-factor authentication',
      changePassword:'Change password',
      currentPwd:    'Current password',
      newPwd:        'New password',
      confirmPwd:    'Confirm password',
      updatePwd:     'Update password',
      updating:      'Updating...',
      twoFactor:     'Two-factor authentication',
      twoFactorDesc: 'Extra protection via TOTP app',
      twoFactorOn:   'Enabled',
      twoFactorOff:  'Disabled',
      setup2fa:      'Enable 2FA',
      disable2fa:    'Disable 2FA',
      sessions:      'Active sessions',
      sessionsDesc:  'Devices currently logged in',
    },
    errors: {
      nameTooShort:  'Name must be at least 2 characters',
      pwdTooShort:   'Password must be at least 6 characters',
      pwdMismatch:   'Passwords do not match',
      updateFailed:  'Update failed',
      pwdWrong:      'Current password is incorrect',
    },
  },
  uz: {
    nav: {
      dashboard:    'Boshqaruv paneli',
      patients:     'Bemorlar',
      doctors:      'Shifokorlar',
      clinics:      'Klinikalar',
      appointments: 'Qabullar',
      transactions: 'Tranzaksiyalar',
      finance:      'Moliya',
      sosCalls:     'SOS chaqiruvlar',
      monitoring:   'Monitoring',
      cms:          'Landing CMS',
      admins:       'Adminlar',
      account:      'Mening hisobim',
      logout:       'Chiqish',
    },
    sections: {
      aivita:    'AIVITA',
      users:     'FOYDALANUVCHILAR',
      partners:  'HAMKORLAR',
      marketing: 'MARKETING',
      content:   'KONTENT',
      security:  'XAVFSIZLIK',
      reports:   'HISOBOTLAR',
      system:    'TIZIM',
      settings:  'SOZLAMALAR',
    },
    account: {
      title:         'Mening hisobim',
      subtitle:      'Profil va sozlamalarni boshqaring',
      profile:       'Profil',
      profileDesc:   'Ismingiz, email va avataring',
      avatar:        'Avatar',
      changePhoto:   'Rasmni o\'zgartirish',
      removePhoto:   'O\'chirish',
      fullName:      'To\'liq ism',
      email:         'Email',
      saveProfile:   'Saqlash',
      saving:        'Saqlanmoqda...',
      saved:         'Saqlandi!',
      appearance:    'Ko\'rinish',
      appearanceDesc:'Mavzu va interfeys tili',
      theme:         'Mavzu',
      themeLight:    'Yorug\'',
      themeDark:     'Qorong\'u',
      themeSystem:   'Tizim',
      language:      'Interfeys tili',
      security:      'Xavfsizlik',
      securityDesc:  'Parol va ikki faktorli autentifikatsiya',
      changePassword:'Parolni o\'zgartirish',
      currentPwd:    'Joriy parol',
      newPwd:        'Yangi parol',
      confirmPwd:    'Parolni takrorlang',
      updatePwd:     'Parolni yangilash',
      updating:      'Yangilanmoqda...',
      twoFactor:     'Ikki faktorli autentifikatsiya',
      twoFactorDesc: 'TOTP ilovasi orqali qo\'shimcha himoya',
      twoFactorOn:   'Yoqilgan',
      twoFactorOff:  'O\'chirilgan',
      setup2fa:      '2FA ni yoqish',
      disable2fa:    '2FA ni o\'chirish',
      sessions:      'Faol sessiyalar',
      sessionsDesc:  'Kirgan qurilmalar',
    },
    errors: {
      nameTooShort:  'Ism kamida 2 ta belgidan iborat bo\'lishi kerak',
      pwdTooShort:   'Parol kamida 6 ta belgidan iborat bo\'lishi kerak',
      pwdMismatch:   'Parollar mos kelmaydi',
      updateFailed:  'Yangilashda xato',
      pwdWrong:      'Joriy parol noto\'g\'ri',
    },
  },
};

export type Translations = {
  nav: Record<string, string>;
  sections: Record<string, string>;
  account: Record<string, string>;
  errors: Record<string, string>;
};

type ContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
};

const I18nContext = createContext<ContextValue>({
  locale: 'ru',
  setLocale: () => {},
  t: translations.ru,
});

const STORAGE_KEY = 'admin-locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && ['ru', 'en', 'uz'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
