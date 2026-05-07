'use client';
import Link from 'next/link';

export function DoctorCtaBanner() {
  return (
    <Link
      href="/ru/doctor-login"
      className="doctor-cta-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: 'linear-gradient(135deg, #2a2540 0%, #3d3560 60%, #1e3a5f 100%)',
        borderRadius: '20px',
        padding: '20px 28px',
        marginBottom: '32px',
        textDecoration: 'none',
        border: '1px solid rgba(110, 95, 160, 0.4)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(110, 95, 160, 0.35)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '32px', flexShrink: 0 }}>👨‍⚕️</span>
        <div>
          <div style={{
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '15px',
            marginBottom: '2px',
            lineHeight: 1.3,
          }}>
            Стань врачом в нашей экосистеме!
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>
            Подключайтесь к Aivita — консультируйте пациентов онлайн
          </div>
        </div>
      </div>
      <div style={{
        flexShrink: 0,
        background: 'linear-gradient(135deg, #6e5fa0, #4a7ab5)',
        color: '#fff',
        fontWeight: '600',
        fontSize: '12px',
        padding: '8px 16px',
        borderRadius: '12px',
        whiteSpace: 'nowrap',
      }}>
        Войти →
      </div>
    </Link>
  );
}
