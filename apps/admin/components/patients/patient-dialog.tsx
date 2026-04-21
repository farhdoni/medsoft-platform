'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiPost, apiPatch } from '@/lib/api';

const schema = z.object({
  fullName: z.string().min(2, 'Минимум 2 символа'),
  phone: z.string().min(9, 'Введите номер телефона'),
  status: z.enum(['active', 'inactive', 'blocked']),
  bloodGroup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PatientDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: { id: string; fullName: string; phone: string; status: string; bloodGroup?: string | null; dateOfBirth?: string | null } | null;
  onSuccess: () => void;
}

export function PatientDialog({ open, onOpenChange, patient, onSuccess }: PatientDialogProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: 'active' } });

  useEffect(() => {
    if (open) {
      form.reset(patient ? {
        fullName: patient.fullName,
        phone: patient.phone,
        status: patient.status as FormValues['status'],
        bloodGroup: patient.bloodGroup ?? '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
      } : { status: 'active' });
    }
  }, [open, patient, form]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, bloodGroup: values.bloodGroup || undefined, dateOfBirth: values.dateOfBirth || undefined };
      if (patient) {
        await apiPatch(`/patients/${patient.id}`, payload);
        toast.success('Пациент обновлён');
      } else {
        await apiPost('/patients', payload);
        toast.success('Пациент создан');
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg || 'Ошибка при сохранении');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? 'Редактировать пациента' : 'Новый пациент'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>ФИО *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон *</FormLabel>
                  <FormControl><Input placeholder="+998901234567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Активен</SelectItem>
                      <SelectItem value="inactive">Неактивен</SelectItem>
                      <SelectItem value="blocked">Заблокирован</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата рождения</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа крови</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Адрес</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
