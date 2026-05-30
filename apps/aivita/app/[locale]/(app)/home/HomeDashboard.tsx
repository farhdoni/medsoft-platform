'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ActivityChart } from '@/components/cabinet/dashboard/ActivityChart';
import { ReportCard } from '@/components/cabinet/dashboard/ReportCard';
import { AiMonitor } from '@/components/cabinet/dashboard/AiMonitor';
import { DoctorsHomeBlock } from '@/components/doctors/DoctorsHomeBlock';
import { ReferralBanner } from './ReferralBanner';
import type { DailyMetrics, ActivityPoint, Report, User } from '@/lib/cabinet-types';

// ─── Types ────────────────────────────────────────────────────────────────────

type LatestVitals = Record<string, { recordedAt: string; value: Record<string, unknown> } | null>;

interface Props {
  locale: string;
  user: User;
  metrics: DailyMetrics;
  activity: ActivityPoint[];
  report: Report | null;
  vitals: LatestVitals;
}

// ─── Block definitions ────────────────────────────────────────────────────────

interface BlockDef { id: string; label: string; icon: string }

const HOME_BLOCKS: BlockDef[] = [
  { id: 'ai_monitor',   label: 'AI Монитор',      icon: '🤖' },
  { id: 'activity',     label: 'Активность',       icon: '📊' },
  { id: 'doctors',      label: 'Врачи',            icon: '👨‍⚕️' },
  { id: 'referral',     label: 'Реферал',          icon: '🎁' },
  { id: 'quick_access', label: 'Быстрый доступ',   icon: '⚡' },
  { id: 'ai_checkup',   label: 'AI Чекап',         icon: '🧬' },
];

const LS_ORDER  = 'home-blocks-order';
const LS_HIDDEN = 'home-blocks-hidden';

function loadOrder():  string[] {
  try { const s = localStorage.getItem(LS_ORDER);  return s ? (JSON.parse(s) as string[]) : HOME_BLOCKS.map(b => b.id); } catch { return HOME_BLOCKS.map(b => b.id); }
}
function loadHidden(): string[] {
  try { const s = localStorage.getItem(LS_HIDDEN); return s ? (JSON.parse(s) as string[]) : []; } catch { return []; }
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const ACCENT = '#9c5e6c';

// ─── CSS injected once ────────────────────────────────────────────────────────

const STYLES = `
@keyframes homeWiggle {
  0%   { transform: rotate(-0.4deg); }
  100% { transform: rotate(0.4deg); }
}
.hb-edit {
  animation: homeWiggle 0.35s ease-in-out infinite alternate;
  border-radius: 18px;
  outline: 2px dashed rgba(156,94,108,0.35);
  outline-offset: 3px;
  position: relative;
  cursor: default;
}
.hb-dragging {
  animation: none !important;
  transform: scale(1.025) !important;
  box-shadow: 0 14px 44px rgba(42,37,64,0.16);
  z-index: 200;
  opacity: 0.92;
  cursor: grabbing;
}
.hb-drag-over::before {
  content: '';
  display: block;
  height: 3px;
  background: ${ACCENT};
  border-radius: 2px;
  margin-bottom: 4px;
}
.hb-handle {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #b0a8c0;
  cursor: grab;
  padding: 6px 4px;
  user-select: none;
  touch-action: none;
  z-index: 10;
  line-height: 1;
}
.hb-handle:active { cursor: grabbing; }
.hb-hide-btn {
  position: absolute;
  right: -7px;
  top: -7px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dc3545;
  color: white;
  font-size: 15px;
  border: 2.5px solid white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(220,53,69,0.35);
  transition: transform .15s;
}
.hb-hide-btn:hover { transform: scale(1.15); }
`;

// ─── DraggableBlock ───────────────────────────────────────────────────────────

interface DraggableBlockProps {
  id: string;
  editMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onHide: () => void;
  children: React.ReactNode;
}

function DraggableBlock({
  id, editMode, isDragging, isDragOver,
  onHandlePointerDown, onHide, children,
}: DraggableBlockProps) {
  const classes = [
    editMode   ? 'hb-edit'     : '',
    isDragging ? 'hb-dragging' : '',
    isDragOver ? 'hb-drag-over': '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-block-id={id}
      style={{ position: 'relative', transition: isDragging ? 'none' : 'box-shadow .2s, transform .2s' }}
    >
      {editMode && !isDragging && (
        <>
          {/* Drag handle */}
          <div
            className="hb-handle"
            onPointerDown={onHandlePointerDown}
            aria-label="Перетащить блок"
          >
            ⠿
          </div>
          {/* Hide button */}
          <button
            className="hb-hide-btn"
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            aria-label="Скрыть блок"
          >
            ×
          </button>
        </>
      )}
      {children}
    </div>
  );
}

// ─── Hidden blocks restore panel ─────────────────────────────────────────────

function HiddenBlocksPanel({
  hidden, editMode, onRestore,
}: { hidden: string[]; editMode: boolean; onRestore: (id: string) => void }) {
  if (!editMode || hidden.length === 0) return null;
  return (
    <div style={{ margin: '12px 0 4px', padding: '12px 14px', borderRadius: 14, background: '#f4f3ef', border: '1.5px dashed #d8d4cc' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9a96a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Скрытые блоки — нажмите чтобы вернуть
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {hidden.map(id => {
          const def = HOME_BLOCKS.find(b => b.id === id);
          if (!def) return null;
          return (
            <button key={id} onClick={() => onRestore(id)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: '1.5px solid #d8d4cc',
                background: '#fff', fontSize: 12, fontWeight: 600, color: '#6a6580',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <span>{def.icon}</span> {def.label} +
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeDashboard({ locale, activity, report, vitals }: Props) {
  const [blockOrder,  setBlockOrder]  = useState<string[]>(HOME_BLOCKS.map(b => b.id));
  const [hiddenBlocks, setHiddenBlocks] = useState<string[]>([]);
  const [editMode,    setEditMode]    = useState(false);
  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [dragOverId,  setDragOverId]  = useState<string | null>(null);
  const [hydrated,    setHydrated]    = useState(false);

  // Load from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setBlockOrder(loadOrder());
    setHiddenBlocks(loadHidden());
    setHydrated(true);
  }, []);

  // ── Persist ─────────────────────────────────────────────────────────────────
  const persist = useCallback((order: string[], hidden: string[]) => {
    try {
      localStorage.setItem(LS_ORDER,  JSON.stringify(order));
      localStorage.setItem(LS_HIDDEN, JSON.stringify(hidden));
    } catch { /* ignore */ }
  }, []);

  // ── Reorder ─────────────────────────────────────────────────────────────────
  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setBlockOrder(prev => {
      const arr  = [...prev];
      const from = arr.indexOf(fromId);
      const to   = arr.indexOf(toId);
      if (from === -1 || to === -1) return prev;
      arr.splice(from, 1);
      arr.splice(to, 0, fromId);
      persist(arr, hiddenBlocks);
      return arr;
    });
  }, [hiddenBlocks, persist]);

  // ── Hide / Restore ───────────────────────────────────────────────────────────
  const hideBlock = useCallback((id: string) => {
    setHiddenBlocks(prev => {
      const next = [...prev, id];
      persist(blockOrder, next);
      return next;
    });
  }, [blockOrder, persist]);

  const restoreBlock = useCallback((id: string) => {
    setHiddenBlocks(prev => {
      const next = prev.filter(x => x !== id);
      persist(blockOrder, next);
      return next;
    });
  }, [blockOrder, persist]);

  // ── Pointer-based drag (mouse + touch) ────────────────────────────────────
  const dragState = useRef<{ id: string; pointerId: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { id, pointerId: e.pointerId };
    setDraggingId(id);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    // Find which block the pointer is currently over
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const blockEl = (el as HTMLElement).closest('[data-block-id]') as HTMLElement | null;
    const overId = blockEl?.dataset.blockId ?? null;
    if (overId && overId !== dragState.current.id) {
      setDragOverId(overId);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragState.current) return;
    const { id: fromId } = dragState.current;
    dragState.current = null;

    if (dragOverId && dragOverId !== fromId) {
      reorder(fromId, dragOverId);
    }
    setDraggingId(null);
    setDragOverId(null);
  }, [dragOverId, reorder]);

  // ── Render block content ──────────────────────────────────────────────────
  const renderBlock = (id: string) => {
    switch (id) {
      case 'ai_monitor':
        return (
          <section className="px-4 pt-4 pb-0 sm:px-7">
            <AiMonitor latest={vitals} compact locale={locale} />
          </section>
        );
      case 'activity':
        return (
          <div className="grid gap-4 px-7 py-5 lg:grid-cols-[2fr_1fr]">
            <ActivityChart data={activity} />
            <ReportCard report={report} />
          </div>
        );
      case 'doctors':
        return (
          <section className="px-4 pb-4 sm:px-7">
            <DoctorsHomeBlock locale={locale} />
          </section>
        );
      case 'referral':
        return <ReferralBanner locale={locale} />;
      case 'quick_access':
        return (
          <section className="px-4 pb-3 sm:px-7">
            <div className="grid grid-cols-2 gap-3">
              <Link href={`/${locale}/symptom-checker`}
                className="rounded-2xl p-4 block transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f0d4dc 0%, #f8e8ec 100%)', border: '1px solid rgba(156,94,108,0.2)' }}>
                <div className="text-3xl mb-2">🩺</div>
                <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>Проверить симптомы</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>AI-диагностика</p>
              </Link>
              <Link href={`/${locale}/mental-health`}
                className="rounded-2xl p-4 block transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #ede8f8 100%)', border: '1px solid rgba(139,106,174,0.2)' }}>
                <div className="text-3xl mb-2">🧘</div>
                <p className="text-[13px] font-bold" style={{ color: '#2a2540' }}>Ментальное здоровье</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>Настроение · Медитации</p>
              </Link>
            </div>
          </section>
        );
      case 'ai_checkup':
        return (
          <section className="px-4 pb-6 sm:px-7">
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #d4dff0 100%)', border: '1px solid rgba(120,140,200,0.2)' }}>
              <div className="text-4xl mb-2">🧬</div>
              <h3 className="text-[15px] font-bold mb-1" style={{ color: '#2a2540' }}>Пройдите AI-чекап здоровья</h3>
              <p className="text-[12px] mb-3" style={{ color: '#6a6580' }}>Быстрая оценка всех ваших показателей за 3 минуты</p>
              <Link href={`/${locale}/ai-checkup`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)' }}>
                🧬 Начать чекап →
              </Link>
            </div>
          </section>
        );
      default: return null;
    }
  };

  const visibleBlocks = hydrated
    ? blockOrder.filter(id => !hiddenBlocks.includes(id))
    : HOME_BLOCKS.map(b => b.id); // default order on first render

  return (
    <>
      {/* Inject CSS once */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Edit mode toggle button */}
      <div className="flex justify-end px-5 pt-3 pb-1">
        <button
          onClick={() => setEditMode(e => !e)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: `1.5px solid ${editMode ? ACCENT : '#e8e4dc'}`,
            background: editMode ? '#f0d4dc' : '#fafaf8',
            fontSize: 12,
            fontWeight: 700,
            color: editMode ? ACCENT : '#9a96a8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all .2s',
          }}
          aria-label={editMode ? 'Сохранить порядок' : 'Настроить главную'}
        >
          {editMode ? '✓ Готово' : '⠿ Настроить'}
        </button>
      </div>

      {/* Draggable container */}
      <div
        ref={containerRef}
        onPointerMove={editMode ? handlePointerMove : undefined}
        onPointerUp={editMode ? handlePointerUp : undefined}
        onPointerLeave={editMode ? handlePointerUp : undefined}
        style={{ display: 'flex', flexDirection: 'column', gap: editMode ? 4 : 0 }}
      >
        {visibleBlocks.map(id => (
          <DraggableBlock
            key={id}
            id={id}
            editMode={editMode}
            isDragging={draggingId === id}
            isDragOver={dragOverId === id}
            onHandlePointerDown={(e) => handleHandlePointerDown(e, id)}
            onHide={() => hideBlock(id)}
          >
            {renderBlock(id)}
          </DraggableBlock>
        ))}
      </div>

      {/* Restore hidden blocks panel */}
      <div className="px-4 sm:px-7 pb-4">
        <HiddenBlocksPanel
          hidden={hiddenBlocks}
          editMode={editMode}
          onRestore={restoreBlock}
        />
      </div>
    </>
  );
}
