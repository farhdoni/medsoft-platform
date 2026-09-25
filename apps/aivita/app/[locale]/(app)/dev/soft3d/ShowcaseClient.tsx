'use client';

import * as React from 'react';
import { Plate, DarkPlate, Well, WellDark } from '@/components/soft3d/Surfaces';
import { Button3D, FlatButton, ChipDark } from '@/components/soft3d/Button3D';
import { StatTile } from '@/components/soft3d/StatTile';
import { Toggle } from '@/components/soft3d/Toggle';
import { SegmentedControl } from '@/components/soft3d/SegmentedControl';
import { ProgressTrough } from '@/components/soft3d/ProgressTrough';
import { Badge } from '@/components/soft3d/Badge';

function Section({
  title,
  mockup,
  children,
}: {
  title: string;
  mockup: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--s3-ink)' }}>{title}</h2>
        <span style={{ fontSize: 12, color: 'var(--s3-ink-soft)' }}>
          docs/design/patient-cabinet/<strong>{mockup}</strong>
        </span>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  );
}

export function ShowcaseClient({ title }: { title: string }) {
  const [toggleOn, setToggleOn] = React.useState(true);
  const [toggleOff, setToggleOff] = React.useState(false);
  const [segment, setSegment] = React.useState('all');

  return (
    <div className="soft3d" style={{ padding: '24px 18px 80px 18px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--s3-ink)' }}>{title}</h1>
      <p style={{ marginTop: 4, fontSize: 13, color: 'var(--s3-ink-soft)' }}>
        Every Part A component and state. Compare against the referenced mockup file.
      </p>

      <Section title="Plate (.tile)" mockup="Main.dc.html">
        <Plate style={{ borderRadius: 22, padding: 18 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Convex light plate — the base surface.</p>
        </Plate>
      </Section>

      <Section title="DarkPlate (.panel)" mockup="Main.dc.html">
        <DarkPlate style={{ borderRadius: 22, padding: 18 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Dark navy plate.</p>
        </DarkPlate>
      </Section>

      <Section title="Well / WellDark" mockup="Main.dc.html">
        <div style={{ display: 'flex', gap: 12 }}>
          <Well style={{ flex: 1, borderRadius: 16, padding: 16, textAlign: 'center' }}>well</Well>
          <WellDark style={{ flex: 1, borderRadius: 16, padding: 16, textAlign: 'center' }}>well-dark</WellDark>
        </div>
      </Section>

      <Section title="Button3D — clay/sky, states" mockup="Main.dc.html">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button3D variant="clay">Ответить</Button3D>
          <Button3D variant="sky">Sky variant</Button3D>
          <Button3D variant="clay" size="sm">Small</Button3D>
          <Button3D variant="clay" disabled>Disabled</Button3D>
        </div>
        <p style={{ fontSize: 12, color: 'var(--s3-ink-soft)', margin: 0 }}>
          Tab to a button to see the focus ring; click and hold to see active state.
        </p>
      </Section>

      <Section title="Contrast fix — before / after" mockup="README.md (token table)">
        <p style={{ fontSize: 12, color: 'var(--s3-ink-soft)', margin: 0 }}>
          Mockup's literal clay/sky (unchanged everywhere else) fails WCAG AA
          for white button text. Button3D/SegmentedControl now use a
          separate, darker <code>*-btn-*</code> fill instead.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
          <div>
            <div
              style={{
                height: 46, minWidth: 140, borderRadius: 999, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff',
                fontWeight: 800, fontSize: 14,
                background: 'linear-gradient(176deg, var(--s3-clay-lt) 0%, var(--s3-clay) 58%, var(--s3-clay-dk) 100%)',
              }}
            >
              Before
            </div>
            <p style={{ fontSize: 11, color: 'var(--s3-ink-soft)', margin: '6px 0 0 0' }}>
              clay: 2.34:1 (lt) – 2.76:1 (base) — fails 4.5:1
            </p>
          </div>
          <div>
            <Button3D variant="clay" style={{ minWidth: 140 }}>After</Button3D>
            <p style={{ fontSize: 11, color: 'var(--s3-ink-soft)', margin: '6px 0 0 0' }}>
              clay-btn: ≈5.07:1 at text position — passes AA
            </p>
          </div>
          <div>
            <div
              style={{
                height: 46, minWidth: 140, borderRadius: 999, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff',
                fontWeight: 800, fontSize: 14,
                background: 'linear-gradient(176deg, var(--s3-sky-lt) 0%, var(--s3-sky) 58%, var(--s3-sky-dk) 100%)',
              }}
            >
              Before
            </div>
            <p style={{ fontSize: 11, color: 'var(--s3-ink-soft)', margin: '6px 0 0 0' }}>
              sky: 2.11:1 (lt) – 2.68:1 (base) — fails 4.5:1
            </p>
          </div>
          <div>
            <Button3D variant="sky" style={{ minWidth: 140 }}>After</Button3D>
            <p style={{ fontSize: 11, color: 'var(--s3-ink-soft)', margin: '6px 0 0 0' }}>
              sky-btn: ≈5.14:1 at text position — passes AA
            </p>
          </div>
        </div>
      </Section>

      <Section title="FlatButton / ChipDark" mockup="Main.dc.html">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <FlatButton>Позже</FlatButton>
          <ChipDark>chip-dark</ChipDark>
        </div>
      </Section>

      <Section title="StatTile" mockup="Main.dc.html">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <StatTile style={{ padding: 14, borderRadius: 20 }}>
            <p style={{ margin: '10px 0 0 0', fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>Пульс</p>
            <p style={{ margin: '2px 0 0 0', fontSize: 19, fontWeight: 800 }}>72</p>
          </StatTile>
          <StatTile style={{ padding: 14, borderRadius: 20 }}>
            <p style={{ margin: '10px 0 0 0', fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>Сон</p>
            <p style={{ margin: '2px 0 0 0', fontSize: 19, fontWeight: 800 }}>6,2 ч</p>
          </StatTile>
          <StatTile style={{ padding: 14, borderRadius: 20 }}>
            <p style={{ margin: '10px 0 0 0', fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>Шаги</p>
            <p style={{ margin: '2px 0 0 0', fontSize: 19, fontWeight: 800 }}>8,1 тыс</p>
          </StatTile>
        </div>
      </Section>

      <Section title="Toggle" mockup="Gadgets.dc.html">
        <Plate style={{ borderRadius: 20, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
            <span style={{ flexGrow: 1 }}>Checked</span>
            <Toggle checked={toggleOn} onChange={setToggleOn} label="Checked example" />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
            <span style={{ flexGrow: 1 }}>Unchecked</span>
            <Toggle checked={toggleOff} onChange={setToggleOff} label="Unchecked example" />
          </label>
        </Plate>
      </Section>

      <Section title="SegmentedControl" mockup="Docs.dc.html">
        <SegmentedControl
          label="Document filter example"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: 'Всё' },
            { value: 'labs', label: 'Анализы' },
            { value: 'notes', label: 'Заключения' },
            { value: 'scans', label: 'Снимки' },
          ]}
        />
      </Section>

      <Section title="ProgressTrough" mockup="Vaccines.dc.html">
        <DarkPlate style={{ borderRadius: 24, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
            <span>По календарю</span>
            <span>9 из 10</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <ProgressTrough value={9} max={10} label="Прививки по календарю" />
          </div>
        </DarkPlate>
      </Section>

      <Section title="Badge — normal / deviation" mockup="DocView.dc.html">
        <div style={{ display: 'flex', gap: 10 }}>
          <Badge status="normal">в норме</Badge>
          <Badge status="deviation">ниже нормы</Badge>
        </div>
      </Section>
    </div>
  );
}
