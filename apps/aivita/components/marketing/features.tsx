import { getTranslations } from 'next-intl/server';

/* ── Mini phone mocks ──────────────────────────────────────── */
function MockScore() {
  return (
    <div>
      <div style={{ fontSize: 9, opacity: 0.5, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Health Score</div>
      <div className="lp-mock-score-circle"><span className="lp-mock-score-num">87</span></div>
      <div className="lp-mock-score-label">из 100</div>
      <div className="lp-mock-score-trend">↗ +5 за неделю</div>
    </div>
  );
}
function MockAge() {
  return (
    <div className="lp-mock-age">
      <div className="lp-mock-age-tag">ВОЗРАСТ ЗДОРОВЬЯ</div>
      <div className="lp-mock-age-numbers">
        <span className="lp-mock-age-real">32</span>
        <span className="lp-mock-age-health">29</span>
      </div>
      <div className="lp-mock-age-message">↑ Моложе на 3 года!</div>
      <div className="lp-mock-age-share">📤 Поделиться</div>
    </div>
  );
}
function MockPassport() {
  return (
    <div className="lp-mock-passport">
      <div className="lp-mock-passport-header">
        <div className="lp-mock-passport-title">Азиз К.</div>
        <div className="lp-mock-passport-subtitle">Паспорт здоровья</div>
      </div>
      {[['Группа крови','II Rh+'],['Аллергии','Пенициллин'],['Прививки','Все ✓'],['Хроники','Нет']].map(([l,v]) => (
        <div key={l} className="lp-mock-passport-row">
          <span className="label">{l}</span>
          <span className="value">{v}</span>
        </div>
      ))}
    </div>
  );
}
function MockTest() {
  return (
    <div className="lp-mock-test">
      <div style={{ fontSize: 7, opacity: 0.5, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>ВОПРОС 6 ИЗ 10</div>
      <div className="lp-mock-test-q">Часто ли вы испытываете стресс на работе?</div>
      <div className="lp-mock-test-options">
        {['Никогда','Иногда','Часто ✓','Постоянно'].map((o,i) => (
          <div key={o} className={`lp-mock-test-opt${i===2?' active':''}`}>{o}</div>
        ))}
      </div>
      <div className="lp-mock-test-progress"><div className="lp-mock-test-progress-fill" /></div>
      <div className="lp-mock-test-counter">60% пройдено</div>
    </div>
  );
}
function MockChat() {
  return (
    <div className="lp-mock-chat">
      <div className="lp-mock-chat-bubble user">У меня болит голова с утра 😩</div>
      <div className="lp-mock-chat-bubble ai">Сколько часов спал? Был ли стресс?</div>
      <div className="lp-mock-chat-bubble user">Спал 5ч, на работе аврал</div>
      <div className="lp-mock-chat-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}
function MockHabits() {
  return (
    <div className="lp-mock-habits">
      <div style={{ fontSize: 8, opacity: 0.5, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>СЕГОДНЯ</div>
      {[
        { icon: '💧', name: 'Вода',   pct: 75, streak: '🔥7'  },
        { icon: '👟', name: 'Шаги',   pct: 90, streak: '🔥12' },
        { icon: '🌙', name: 'Сон 8ч', pct: 92, streak: '🔥3'  },
        { icon: '🥗', name: 'Овощи',  pct: 50, streak: '🔥1'  },
      ].map(h => (
        <div key={h.name} className="lp-mock-habit-row">
          <span className="lp-mock-habit-icon">{h.icon}</span>
          <span className="lp-mock-habit-name">{h.name}</span>
          <div className="lp-mock-habit-progress">
            <div className="lp-mock-habit-fill" style={{ width: `${h.pct}%` }} />
          </div>
          <span className="lp-mock-habit-streak">{h.streak}</span>
        </div>
      ))}
    </div>
  );
}
function MockReport() {
  return (
    <div className="lp-mock-report">
      <div className="lp-mock-report-doc">
        <div className="lp-mock-report-icon">📄</div>
        <div className="lp-mock-report-title">Отчёт здоровья</div>
        <div className="lp-mock-report-meta">28 апр 2026 · 4 страницы</div>
        <div className="lp-mock-report-pages">
          {[1,2,3,4].map(i => <div key={i} className="lp-mock-report-page" />)}
        </div>
      </div>
      <div className="lp-mock-report-cta">📤 Поделиться</div>
    </div>
  );
}
function MockScanner() {
  return (
    <div className="lp-mock-scanner">
      <div className="lp-mock-scanner-header">
        <div className="lp-mock-scanner-icon">📷</div>
        <div className="lp-mock-scanner-title">СКАНИРОВАНИЕ</div>
      </div>
      <div className="lp-mock-scanner-frame">
        <div className="lp-mock-scanner-doc-title">Анализ крови</div>
        <div className="lp-mock-scanner-doc-line" />
        <div className="lp-mock-scanner-doc-line med" />
        <div className="lp-mock-scanner-doc-line short" />
        <div className="lp-mock-scanner-doc-line" />
        <div className="lp-mock-scanner-doc-line med" />
      </div>
      <div className="lp-mock-scanner-recognized">
        <span className="label">Гемоглобин</span>
        <span className="value">142 г/л ✓</span>
      </div>
      <div className="lp-mock-scanner-recognized">
        <span className="label">Холестерин</span>
        <span className="value">4.8 ✓</span>
      </div>
      <div className="lp-mock-scanner-status">✓ Сохранено в паспорт</div>
    </div>
  );
}

/* ── Feature card component ── */
type TagVariant = 'default' | 'mint' | 'navy' | 'new';
function FeatureCard({
  num, tag, tagVariant = 'default', title, titleSerif, desc, benefit, mock, wide,
}: {
  num: string; tag: string; tagVariant?: TagVariant;
  title: string; titleSerif: string; desc: string; benefit: string;
  mock: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className={`lp-feature-card${wide ? ' wide' : ''}`}>
      <div className="lp-feature-card-content">
        <div className="lp-feature-text">
          <div className="lp-feature-num-wrap">
            <span className="lp-feature-num-shadow">{num}</span>
            <span className="lp-feature-num">{num}</span>
          </div>
          <div className={`lp-feature-tag${tagVariant !== 'default' ? ` ${tagVariant}` : ''}`}>{tag}</div>
          <h3>{title} <span className="serif">{titleSerif}</span></h3>
          <p>{desc}</p>
          <div className="lp-feature-benefit">{benefit}</div>
        </div>
        <div className="lp-feature-mock">
          <div className="lp-mini-phone">
            <div className="lp-mini-screen">{mock}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section ── */
export async function FeaturesSection() {
  const t = await getTranslations('features');

  return (
    <section className="lp-features" id="features">
      <div className="blur-orb" style={{ width: 700, height: 700, background: 'var(--pink)', top: '5%', right: -300, opacity: 0.25 }} />
      <div className="blur-orb" style={{ width: 500, height: 500, background: 'var(--mint-soft)', bottom: '10%', left: -200, opacity: 0.3 }} />

      <div className="lp-container">
        <div className="lp-eyebrow">{t('eyebrow')}</div>
        <h2 className="lp-section-title">
          {t('title1')} <span className="serif">{t('titleAccent')}</span>
        </h2>
        <p className="lp-section-subtitle">{t('subtitle')}</p>

        <div className="lp-features-grid">
          <FeatureCard wide num="01" tag={t('tag1')} tagVariant="navy"
            title={t('f1Title')} titleSerif={t('f1TitleSerif')}
            desc={t('f1Desc')} benefit={t('f1Benefit')} mock={<MockScore />} />

          <FeatureCard num="02" tag={t('tag2')}
            title={t('f2Title')} titleSerif={t('f2TitleSerif')}
            desc={t('f2Desc')} benefit={t('f2Benefit')} mock={<MockAge />} />

          <FeatureCard num="03" tag={t('tag3')} tagVariant="mint"
            title={t('f3Title')} titleSerif={t('f3TitleSerif')}
            desc={t('f3Desc')} benefit={t('f3Benefit')} mock={<MockPassport />} />

          <FeatureCard num="04" tag={t('tag4')}
            title={t('f4Title')} titleSerif={t('f4TitleSerif')}
            desc={t('f4Desc')} benefit={t('f4Benefit')} mock={<MockTest />} />

          <FeatureCard num="05" tag={t('tag5')} tagVariant="mint"
            title={t('f5Title')} titleSerif={t('f5TitleSerif')}
            desc={t('f5Desc')} benefit={t('f5Benefit')} mock={<MockChat />} />

          <FeatureCard num="06" tag={t('tag6')}
            title={t('f6Title')} titleSerif={t('f6TitleSerif')}
            desc={t('f6Desc')} benefit={t('f6Benefit')} mock={<MockHabits />} />

          <FeatureCard num="07" tag={t('tag7')} tagVariant="navy"
            title={t('f7Title')} titleSerif={t('f7TitleSerif')}
            desc={t('f7Desc')} benefit={t('f7Benefit')} mock={<MockReport />} />

          <FeatureCard wide num="08" tag={t('tag8')} tagVariant="new"
            title={t('f8Title')} titleSerif={t('f8TitleSerif')}
            desc={t('f8Desc')} benefit={t('f8Benefit')} mock={<MockScanner />} />
        </div>
      </div>
    </section>
  );
}
