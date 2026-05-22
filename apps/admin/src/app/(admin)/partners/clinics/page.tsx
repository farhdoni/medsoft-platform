import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartnersClinicPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Building2 className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-semibold text-muted-foreground">Скоро — подключение клиник</h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground/70">
        Клиники-партнёры получают доступ к базе пациентов Aivita и записи онлайн.
        Тарифные планы: Стартовый — 500 000 сум/мес, Бизнес — 1 500 000 сум/мес, Энтерпрайз — от 3 000 000 сум/мес.
      </p>
      <div className="mt-6">
        <Button disabled variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Добавить клинику
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground/50">🔜 В разработке — Q4 2025</p>
    </div>
  );
}
