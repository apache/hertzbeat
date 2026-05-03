import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export interface SearchRowProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange'> {
  value: string;
  placeholder: string;
  searchLabel: string;
  clearLabel?: string;
  filters?: React.ReactNode;
  inputWidthClassName?: string;
  searchDisabled?: boolean;
  showClearWhenEmpty?: boolean;
  trailingActions?: React.ReactNode;
  onValueChange: (value: string) => void;
  onSearch: () => void;
  onClear?: () => void;
}

const searchButtonClassName =
  'h-8 min-w-[72px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

export function SearchRow({
  value,
  placeholder,
  searchLabel,
  clearLabel,
  filters,
  inputWidthClassName = 'w-[320px]',
  searchDisabled = false,
  showClearWhenEmpty = false,
  trailingActions,
  onValueChange,
  onSearch,
  onClear,
  className,
  ...props
}: SearchRowProps) {
  return (
    <form
      data-cold-search-row-owner="cold-search-row"
      data-cold-search-layout="compact-detached-button"
      className={cn('mb-6 flex w-fit max-w-full min-w-0 flex-wrap items-center gap-2', className)}
      onSubmit={event => {
        event.preventDefault();
        onSearch();
      }}
      {...props}
    >
      <input
        type="search"
        data-cold-search-input="fixed-width-direct"
        data-cold-search-control="direct-input"
        data-cold-search-chrome="no-extra-input-shell"
        className={cn(
          'h-8 max-w-full rounded-[3px] border border-[#282d36] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.12)]',
          inputWidthClassName
        )}
        placeholder={placeholder}
        value={value}
        onChange={event => onValueChange(event.target.value)}
      />
      {filters ? (
        <div data-cold-search-filter-slot="inline-before-submit" className="flex min-w-0 flex-wrap items-center gap-2">
          {filters}
        </div>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="default"
        data-cold-search-action="submit"
        className={searchButtonClassName}
        disabled={searchDisabled}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        {searchLabel}
      </Button>
      {onClear && (value || showClearWhenEmpty) ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          data-cold-search-action="clear"
          className={searchButtonClassName}
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {clearLabel}
        </Button>
      ) : null}
      {trailingActions ? (
        <div data-cold-search-trailing-actions="detached-secondary" className="flex min-w-0 flex-wrap items-center gap-2">
          {trailingActions}
        </div>
      ) : null}
    </form>
  );
}
