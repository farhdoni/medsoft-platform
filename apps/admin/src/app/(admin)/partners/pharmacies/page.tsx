'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type Pharmacy = {
  id: number; name: string; legalName: string | null; inn: string | null;
  phone: string | null; email: string | null;
  commissionPercent: string | null; status: string | null;
  tier: string | null; createdAt: string;
};

const TIER_LABELS: Record<string, string> = { starter: 'Starter', business: 'Business', network: 'Network' };
const TIER_VARIANTS: Record<string, 'secondary' | 'success' | 'default'> = {
  starter: 'secondary', business: 'success', network: 'default',
};

export default function PharmaciesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const [form, setForm] = useState({
    name: '', legalName: '', inn: '', email: '', phone: '',
    commissionPercent: '10', tier: 'starter',
    directorEmail: '', directorName: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pharmacies', statusFilter, tierFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (tierFilter) params.set('tier', tierFilter);
      return api.get<{ data: Pharmacy[] }>(`/v1/admin/pharmacies?${params}`);
    },
  });

  const addMutation = useMutation({
    mutationFn: () => api.post('/v1/admin/pharmacies', {
      ...form,
      commissionPercent: parseFloat(form.commissionPercent) || 10,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pharmacies'] });
      setAddOpen(false);
      setForm({ name: '', legalName: '', inn: '', email: '', phone: '', commissionPercent: '10', tier: 'starter', directorEmail: '', directorName: '' });
      toast.success(t.partners.pharmacyAdded);
    },
    onError: () => toast.error(t.partners.addFailed),
  });

  const filtered = (data?.data ?? []).filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.inn ?? '').includes(q) || (p.email ?? '').toLowerCase().includes(q);
  });

  const columns: ColumnDef<Pharmacy>[] = [
    {
      accessorKey: 'name',
      header: t.partners.colName,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          {row.original.legalName && (
            <p className="text-xs text-muted-foreground">{row.original.legalName}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'inn',
      header: t.partners.inn,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.inn ?? '—'}</span>,
    },
    {
      header: t.partners.contact,
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.email ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.phone ?? ''}</p>
        </div>
      ),
    },
    {
      header: t.partners.tier,
      cell: ({ row }) => (
        <Badge variant={TIER_VARIANTS[row.original.tier ?? 'starter'] ?? 'secondary'}>
          {TIER_LABELS[row.original.tier ?? 'starter'] ?? row.original.tier}
        </Badge>
      ),
    },
    {
      header: t.partners.commission,
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.commissionPercent ?? '10'}%</span>,
    },
    {
      header: t.common.status,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>
          {row.original.status === 'active' ? t.partners.active : t.partners.inactive}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm" variant="ghost" className="h-7"
          onClick={e => { e.stopPropagation(); router.push(`/partners/pharmacies/${row.original.id}`); }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs w-56"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.partners.searchHint}
          />
        </div>
        <Select value={tierFilter || 'all'} onValueChange={v => setTierFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={t.partners.tier} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.partners.allTiers}</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="network">Network</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={t.common.status} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="active">{t.partners.fActive}</SelectItem>
            <SelectItem value="inactive">{t.partners.fInactive}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="ml-auto h-8" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.partners.addPharmacy}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        total={filtered.length}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        isLoading={isLoading}
        onRowClick={row => router.push(`/partners/pharmacies/${row.id}`)}
      />

      {/* Add pharmacy dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.partners.newPharmacy}</DialogTitle>
            <DialogDescription>{t.partners.newPharmacyHint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>{t.partners.pharmacyName}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.partners.pharmacyNameHint} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.partners.legalName}</Label>
                <Input value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))} placeholder={t.partners.legalNameHint} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.partners.inn}</Label>
                <Input className="font-mono" value={form.inn} onChange={e => setForm(f => ({ ...f, inn: e.target.value }))} placeholder="123456789" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@pharmacy.uz" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.partners.phone}</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998 ..." />
              </div>
              <div className="space-y-1.5">
                <Label>{t.partners.commissionPct}</Label>
                <Input type="number" min={0} max={50} step={0.5} value={form.commissionPercent} onChange={e => setForm(f => ({ ...f, commissionPercent: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.partners.tier}</Label>
                <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">{t.partners.directorAccount}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.partners.directorEmail}</Label>
                  <Input type="email" value={form.directorEmail} onChange={e => setForm(f => ({ ...f, directorEmail: e.target.value }))} placeholder="director@..." />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.partners.directorName}</Label>
                  <Input value={form.directorName} onChange={e => setForm(f => ({ ...f, directorName: e.target.value }))} placeholder={t.partners.directorNameHint} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t.common.cancel}</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !form.name.trim()}
            >
              {addMutation.isPending ? t.partners.adding : t.partners.addPharmacy}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
