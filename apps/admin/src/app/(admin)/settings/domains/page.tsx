'use client';

import { CheckCircle2, Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DOMAINS = [
  { domain: 'aivita.uz', purposeKey: 'domainLanding', ssl: 'valid', ip: '188.166.120.0' },
  { domain: 'app.aivita.uz', purposeKey: 'domainApp', ssl: 'valid', ip: '188.166.120.0' },
  { domain: 'api.aivita.uz', purposeKey: 'domainApi', ssl: 'valid', ip: '109.123.249.224' },
  { domain: 'admin.aivita.uz', purposeKey: 'domainAdmin', ssl: 'valid', ip: '188.166.120.0' },
];

export default function DomainsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">{t.settings.domainsTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.domainsSubtitle}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />{t.settings.domainsRegistered}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {DOMAINS.map(d => (
              <div key={d.domain} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm">{d.domain}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.settings[d.purposeKey]} · IP: {d.ip}</p>
                </div>
                <Badge variant={d.ssl === 'valid' ? 'success' : 'destructive'}>
                  SSL {d.ssl === 'valid' ? t.settings.certValid : t.settings.certExpired}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>{t.settings.dnsNote}</p>
        <p className="mt-1">{t.settings.sslNote}</p>
      </div>
    </div>
  );
}
