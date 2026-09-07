'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type SosCall = {
  id: string;
  patientId: string;
  status: string;
  locationLat: string;
  locationLng: string;
  addressResolved: string | null;
  createdAt: string;
};

export default function SosCallsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sos-calls', page],
    queryFn: () => api.get<{ data: SosCall[]; total: number }>(`/v1/sos-calls?page=${page}&limit=20`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/v1/sos-calls/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sos-calls'] }); toast.success(t.misc.statusUpdated); },
    onError: () => toast.error(t.common.error),
  });

  const columns: ColumnDef<SosCall>[] = [
    {
      accessorKey: 'status', header: t.common.status,
      cell: ({ row }) => <Badge variant={row.original.status === 'resolved' ? 'success' : row.original.status === 'triggered' ? 'destructive' : 'warning'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'addressResolved', header: t.misc.address, cell: ({ row }) => row.original.addressResolved ?? `${row.original.locationLat}, ${row.original.locationLng}` },
    { accessorKey: 'createdAt', header: t.misc.time, cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions', header: t.aivita.actions,
      cell: ({ row }) => row.original.status === 'triggered' ? (
        <Button size="sm" onClick={() => updateMutation.mutate({ id: row.original.id, status: 'operator_assigned' })}>
          {t.misc.accept}
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.nav.sosCalls}</h1>
        <p className="text-muted-foreground">{t.misc.sosSubtitle}</p>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.total ?? 0} page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />
    </div>
  );
}
