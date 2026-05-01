'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, total, page, pageSize, onPageChange, isLoading, onRowClick }: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">Загрузка...</td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">Нет данных</td></tr>
            ) : table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-t hover:bg-muted/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Всего: {total.toLocaleString()}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>{page} / {totalPages || 1}</span>
          <Button variant="outline" size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
