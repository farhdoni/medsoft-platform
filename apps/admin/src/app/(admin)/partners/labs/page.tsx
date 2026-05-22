import { FlaskConical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LabsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-semibold text-muted-foreground">Скоро — подключение лабораторий</h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground/70">
        Лаборатории (Synevo, InVitro, Anor, Gemotest) — направления от врачей,
        результаты анализов автоматически попадают в медицинскую карту пациента.
        Комиссия платформы: 10–15%.
      </p>
      <div className="mt-6 flex gap-3">
        <Button disabled variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Добавить лабораторию
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground/50">🔜 В разработке — Q3 2025</p>
    </div>
  );
}
