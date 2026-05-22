import { CheckCircle2, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DOMAINS = [
  { domain: 'aivita.uz', purpose: 'Лендинг', ssl: 'valid', ip: '188.166.120.0' },
  { domain: 'app.aivita.uz', purpose: 'Приложение (PWA)', ssl: 'valid', ip: '188.166.120.0' },
  { domain: 'api.aivita.uz', purpose: 'API сервер', ssl: 'valid', ip: '109.123.249.224' },
  { domain: 'admin.aivita.uz', purpose: 'Панель администратора', ssl: 'valid', ip: '188.166.120.0' },
];

export default function DomainsPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Домены</h2>
        <p className="text-sm text-muted-foreground">Информация о доменах платформы. Управляется через Coolify / DNS-провайдер.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Зарегистрированные домены</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {DOMAINS.map(d => (
              <div key={d.domain} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm">{d.domain}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.purpose} · IP: {d.ip}</p>
                </div>
                <Badge variant={d.ssl === 'valid' ? 'success' : 'destructive'}>
                  SSL {d.ssl === 'valid' ? 'Действителен' : 'Истёк'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>Для изменения DNS-записей или SSL-сертификатов обратитесь к вашему DNS-провайдеру или Coolify-панели.</p>
        <p className="mt-1">SSL-сертификаты обновляются автоматически через Let&apos;s Encrypt.</p>
      </div>
    </div>
  );
}
