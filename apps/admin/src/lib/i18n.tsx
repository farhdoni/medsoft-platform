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
      support:      'Поддержка',
      logout:       'Выйти',
    },
    sections: {
      aivita:    'AIVITA',
      users:     'ПОЛЬЗОВАТЕЛИ',
      partners:  'ПАРТНЁРЫ',
      finance:   'ФИНАНСЫ',
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
    auth: {
      eyebrow:       'панель администратора',
      greeting1:     'Добро пожаловать,',
      greeting2:     'рады снова вас видеть',
      brandSub:      'Клиники, врачи, платежи и заявки экосистемы AIVITA — в одной панели. Войдите, чтобы продолжить работу.',
      formTitle:     'Вход в систему',
      emailLabel:    'Email',
      pwdLabel:      'Пароль',
      forgot:        'Забыли пароль?',
      submit:        'Войти',
      submitting:    'Вход...',
      title2fa:      'Подтверждение входа',
      desc2fa:       'Введите код из приложения аутентификатора',
      code2fa:       'Код 2FA (6 цифр)',
      verify:        'Подтвердить',
      verifying:     'Проверяю...',
      back:          'Назад',
      trust:         'Вход защищён двухфакторной аутентификацией',
      foot:          'Внутренняя система',
      showPwd:       'Показать пароль',
      hidePwd:       'Скрыть пароль',
      toggleTheme:   'Сменить тему',
      loginFailed:   'Ошибка при входе',
    },
    common: {
      search:         'Поиск...',
      searchCommands: 'Поиск команд',
      nothingFound:   'Ничего не найдено.',
      navigation:     'Навигация',
      select:         'выбрать',
      close:          'закрыть',
      openMenu:       'Открыть меню',
      noData:         'Нет данных',
    },
    dashboard: {
      subtitle:         'Обзор платформы aivita.uz',
      usersTotal:       'Всего пользователей',
      activeToday:      'Активные сегодня',
      uniquePer24h:     'уникальных за 24ч',
      pendingModeration:'на модерации',
      allVerified:      'Все верифицированы ✓',
      subscriptions:    'Подписки',
      revenueMonth:     'Выручка за месяц',
      currentMonth:     'текущий месяц',
      apkPatient:       'APK Пациент',
      apkDoctor:        'APK Врач',
      today:            'сегодня',
      systemHealth:     'Состояние системы',
      checking:         'Проверка...',
      healthy:          'Работает нормально',
      unhealthy:        'Есть проблемы',
      services:         'сервисов',
      registrations30:  'Регистрации за 30 дней',
      revenue30:        'Выручка за 30 дней',
      date:             'Дата',
      revenue:          'Выручка',
      recentRegistrations: 'Последние регистрации',
      anon:             'Аноним',
      moderation:       'На модерации',
      noPending:        'Нет врачей на модерации ✓',
      noSpecialization: 'Специализация не указана',
      approve:          'Одобрить',
      reject:           'Отклонить',
      recentPayments:   'Последние платежи',
      noPayments:       'Нет платежей',
      doctorApproved:   'Врач одобрен ✓',
      doctorRejected:   'Врач отклонён',
      actionFailed:     'Не удалось выполнить действие',
      rejectReason:     'Причина отклонения:',
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
      support:      'Support',
      logout:       'Log out',
    },
    sections: {
      aivita:    'AIVITA',
      users:     'USERS',
      partners:  'PARTNERS',
      finance:   'FINANCE',
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
    auth: {
      eyebrow:       'admin panel',
      greeting1:     'Welcome back,',
      greeting2:     'good to see you again',
      brandSub:      'Clinics, doctors, payments and requests across the AIVITA ecosystem — in one panel. Sign in to continue.',
      formTitle:     'Sign in',
      emailLabel:    'Email',
      pwdLabel:      'Password',
      forgot:        'Forgot password?',
      submit:        'Sign in',
      submitting:    'Signing in...',
      title2fa:      'Confirm sign-in',
      desc2fa:       'Enter the code from your authenticator app',
      code2fa:       '2FA code (6 digits)',
      verify:        'Confirm',
      verifying:     'Checking...',
      back:          'Back',
      trust:         'Sign-in is protected by two-factor authentication',
      foot:          'Internal system',
      showPwd:       'Show password',
      hidePwd:       'Hide password',
      toggleTheme:   'Toggle theme',
      loginFailed:   'Sign-in failed',
    },
    common: {
      search:         'Search...',
      searchCommands: 'Command search',
      nothingFound:   'Nothing found.',
      navigation:     'Navigation',
      select:         'select',
      close:          'close',
      openMenu:       'Open menu',
      noData:         'No data',
    },
    dashboard: {
      subtitle:         'aivita.uz platform overview',
      usersTotal:       'Total users',
      activeToday:      'Active today',
      uniquePer24h:     'unique in 24h',
      pendingModeration:'awaiting review',
      allVerified:      'All verified ✓',
      subscriptions:    'Subscriptions',
      revenueMonth:     'Revenue this month',
      currentMonth:     'current month',
      apkPatient:       'APK Patient',
      apkDoctor:        'APK Doctor',
      today:            'today',
      systemHealth:     'System health',
      checking:         'Checking...',
      healthy:          'All systems normal',
      unhealthy:        'Issues detected',
      services:         'services',
      registrations30:  'Sign-ups, last 30 days',
      revenue30:        'Revenue, last 30 days',
      date:             'Date',
      revenue:          'Revenue',
      recentRegistrations: 'Recent sign-ups',
      anon:             'Anonymous',
      moderation:       'Awaiting review',
      noPending:        'No doctors awaiting review ✓',
      noSpecialization: 'Specialization not set',
      approve:          'Approve',
      reject:           'Reject',
      recentPayments:   'Recent payments',
      noPayments:       'No payments',
      doctorApproved:   'Doctor approved ✓',
      doctorRejected:   'Doctor rejected',
      actionFailed:     'Action failed',
      rejectReason:     'Reason for rejection:',
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
      support:      "Qo'llab-quvvatlash",
      logout:       'Chiqish',
    },
    sections: {
      aivita:    'AIVITA',
      users:     'FOYDALANUVCHILAR',
      partners:  'HAMKORLAR',
      finance:   'MOLIYA',
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
    auth: {
      eyebrow:       'administrator paneli',
      greeting1:     'Xush kelibsiz,',
      greeting2:     'sizni yana ko\'rganimizdan xursandmiz',
      brandSub:      'AIVITA ekotizimidagi klinikalar, shifokorlar, to\'lovlar va arizalar — bitta panelda. Davom etish uchun tizimga kiring.',
      formTitle:     'Tizimga kirish',
      emailLabel:    'Email',
      pwdLabel:      'Parol',
      forgot:        'Parolni unutdingizmi?',
      submit:        'Kirish',
      submitting:    'Kirilmoqda...',
      title2fa:      'Kirishni tasdiqlash',
      desc2fa:       'Autentifikator ilovasidagi kodni kiriting',
      code2fa:       '2FA kodi (6 raqam)',
      verify:        'Tasdiqlash',
      verifying:     'Tekshirilmoqda...',
      back:          'Orqaga',
      trust:         'Kirish ikki faktorli autentifikatsiya bilan himoyalangan',
      foot:          'Ichki tizim',
      showPwd:       'Parolni ko\'rsatish',
      hidePwd:       'Parolni yashirish',
      toggleTheme:   'Mavzuni almashtirish',
      loginFailed:   'Kirishda xatolik',
    },
    common: {
      search:         'Qidiruv...',
      searchCommands: 'Buyruqlarni qidirish',
      nothingFound:   'Hech narsa topilmadi.',
      navigation:     'Navigatsiya',
      select:         'tanlash',
      close:          'yopish',
      openMenu:       'Menyuni ochish',
      noData:         "Ma'lumot yo'q",
    },
    dashboard: {
      subtitle:         'aivita.uz platformasi sharhi',
      usersTotal:       'Jami foydalanuvchilar',
      activeToday:      'Bugun faol',
      uniquePer24h:     '24 soatda noyob',
      pendingModeration:'moderatsiyada',
      allVerified:      'Barchasi tasdiqlangan ✓',
      subscriptions:    'Obunalar',
      revenueMonth:     'Oylik tushum',
      currentMonth:     'joriy oy',
      apkPatient:       'APK Bemor',
      apkDoctor:        'APK Shifokor',
      today:            'bugun',
      systemHealth:     'Tizim holati',
      checking:         'Tekshirilmoqda...',
      healthy:          'Normal ishlamoqda',
      unhealthy:        'Muammolar bor',
      services:         'ta xizmat',
      registrations30:  "30 kunlik ro'yxatdan o'tishlar",
      revenue30:        '30 kunlik tushum',
      date:             'Sana',
      revenue:          'Tushum',
      recentRegistrations: "So'nggi ro'yxatdan o'tishlar",
      anon:             'Anonim',
      moderation:       'Moderatsiyada',
      noPending:        "Moderatsiyada shifokor yo'q ✓",
      noSpecialization: "Mutaxassislik ko'rsatilmagan",
      approve:          'Tasdiqlash',
      reject:           'Rad etish',
      recentPayments:   "So'nggi to'lovlar",
      noPayments:       "To'lovlar yo'q",
      doctorApproved:   'Shifokor tasdiqlandi ✓',
      doctorRejected:   'Shifokor rad etildi',
      actionFailed:     'Amalni bajarib bo\'lmadi',
      rejectReason:     'Rad etish sababi:',
    },
  },
};

export type Translations = {
  nav: Record<string, string>;
  sections: Record<string, string>;
  account: Record<string, string>;
  errors: Record<string, string>;
  auth: Record<string, string>;
  common: Record<string, string>;
  dashboard: Record<string, string>;
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

  // Keep <html lang> honest — screen readers and the browser's own
  // translation prompt both read it, and the root layout can only ship a
  // static value.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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

// Intl has no usable data for Uzbek in Chrome — `uz-UZ` renders as "M09 7,
// Mon" — so that one locale is spelled out by hand while ru/en go through
// Intl as normal.
const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** "понедельник, 7 сентября" / "dushanba, 7 sentabr" / "Monday, 7 September" */
export function formatLongDate(date: Date, locale: Locale): string {
  if (locale === 'uz') {
    return `${UZ_WEEKDAYS[date.getDay()]}, ${date.getDate()} ${UZ_MONTHS[date.getMonth()]}`;
  }
  return date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
