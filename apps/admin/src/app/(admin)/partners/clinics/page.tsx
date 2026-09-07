'use client';

import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function PartnersClinicPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Building2 className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-semibold text-muted-foreground">{t.partners.clinicsSoon}</h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground/70">
        {t.partners.clinicsBody}
      </p>
      <div className="mt-6">
        <Button disabled variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t.partners.addClinic}
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground/50">{t.partners.clinicsEta}</p>
    </div>
  );
}
