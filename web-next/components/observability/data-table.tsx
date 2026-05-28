'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  type Row,
  useReactTable,
  type ColumnDef,
  type TableOptions
} from '@tanstack/react-table';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { cn } from '../../lib/utils';

const DEFAULT_DATA_TABLE_EMPTY_STATE = SUPPLEMENTAL_MESSAGES['en-US']?.['common.no-data'] ?? 'common.no-data';

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  className?: string;
  emptyState?: React.ReactNode;
  tableOptions?: Partial<TableOptions<TData>>;
  onRowClick?: (row: Row<TData>) => void;
  rowClassName?: (row: Row<TData>) => string | undefined;
  rowAttributes?: (row: Row<TData>) => Record<string, string | undefined>;
};

export function DataTable<TData>({
  columns,
  data,
  className,
  emptyState = DEFAULT_DATA_TABLE_EMPTY_STATE,
  tableOptions,
  onRowClick,
  rowClassName,
  rowAttributes
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableOptions,
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <div className={cn('overflow-hidden rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]', className)}>
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)]">
          {headerGroups.map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-4 text-[12px] text-[var(--ops-text-secondary)]"
                colSpan={table.getAllLeafColumns().length || 1}
              >
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr
                key={row.id}
                className={cn(
                  'border-t border-[var(--ops-border-color)] transition-colors hover:bg-[var(--ops-surface-raised)]',
                  onRowClick ? 'cursor-pointer' : '',
                  rowClassName?.(row)
                )}
                {...(rowAttributes?.(row) || {})}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2 text-[12px] text-[var(--ops-text-primary)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
