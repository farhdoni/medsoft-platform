'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { apiGet } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/queries';

interface AiLog {
  id: string;
  role: string;
  content: string;
  intent: string | null;
  outcome: string | null;
  modelName: string | null;
  createdAt: string;
}

export default function AiLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<AiLog>>({
    queryKey: ['ai-logs', page],
    queryFn: () => apiGet('/ai-logs', { page, limit: 20 }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI-логи</h1>
      <DataTable
        columns={[
          { key: 'createdAt', header: 'Время', cell: (r) => format(new Date(r.createdAt), 'dd MMM yyyy HH:mm', { locale: ru }) },
          { key: 'role', header: 'Роль', cell: (r) => <Badge variant="outline">{r.role}</Badge> },
          { key: 'intent', header: 'Намерение', cell: (r) => r.intent ?? '—' },
          { key: 'outcome', header: 'Результат', cell: (r) => r.outcome ?? '—' },
          { key: 'model', header: 'Модель', cell: (r) => r.modelName ?? '—' },
          { key: 'content', header: 'Сообщение', cell: (r) => (
            <span className="truncate max-w-xs block">{r.content}</span>
          ), className: 'max-w-xs' },
        ]}
        data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={20} isLoading={isLoading} onPageChange={setPage}
      />
    </div>
  );
}
