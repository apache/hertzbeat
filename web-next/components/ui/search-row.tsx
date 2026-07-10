import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';

export interface SearchRowProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange'> {
  value: string;
  placeholder: string;
  searchLabel?: string;
  clearLabel?: string;
  filters?: React.ReactNode;
  inputWidthClassName?: string;
  searchDisabled?: boolean;
  showClearWhenEmpty?: boolean;
  trailingActions?: React.ReactNode;
  onValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  onClear?: () => void;
}

const searchButtonClassName =
  'h-8 min-w-[72px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';
const DEFAULT_SEARCH_ROW_SEARCH_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['common.search'] ?? 'common.search';
const DEFAULT_SEARCH_ROW_CLEAR_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['common.clear'] ?? 'common.clear';

export function SearchRow({
  value,
  placeholder,
  searchLabel = DEFAULT_SEARCH_ROW_SEARCH_LABEL,
  clearLabel = DEFAULT_SEARCH_ROW_CLEAR_LABEL,
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
  const latestSearchValueRef = React.useRef(value);

  React.useEffect(() => {
    latestSearchValueRef.current = value;
  }, [value]);

  const submitSearchValue = (candidateValue: string) => {
    latestSearchValueRef.current = candidateValue;
    onSearch(candidateValue);
  };

  const handleValueInput = (event: React.FormEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value;
    latestSearchValueRef.current = nextValue;
    onValueChange(nextValue);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitSearchValue(event.currentTarget.value);
  };

  return (
    <form
      data-hz-ui="search-row"
      data-hz-search-row-owner="hertzbeat-ui-search-row"
      data-hz-search-layout="compact-detached-button"
      className={cn('mb-6 flex w-fit max-w-full min-w-0 flex-wrap items-center gap-2', className)}
      onSubmit={event => {
        event.preventDefault();
        const formValue = new FormData(event.currentTarget).get('search');
        const submittedValue = typeof formValue === 'string' && formValue !== value ? formValue : latestSearchValueRef.current;
        submitSearchValue(submittedValue);
      }}
      {...props}
    >
      <input
        name="search"
        type="search"
        data-hz-search-input="fixed-width-direct"
        data-hz-search-control="direct-input"
        data-hz-search-chrome="no-extra-input-shell"
        data-hz-search-enter-submit="direct-input"
        className={cn(
          'h-8 max-w-full rounded-[3px] border border-[#282d36] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.12)]',
          inputWidthClassName
        )}
        placeholder={placeholder}
        value={value}
        onInput={handleValueInput}
        onKeyDown={handleInputKeyDown}
      />
      {filters ? (
        <div data-hz-search-filter-slot="inline-before-submit" className="flex min-w-0 flex-wrap items-center gap-2">
          {filters}
        </div>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant="default"
        data-hz-search-action="submit"
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
          data-hz-search-action="clear"
          className={searchButtonClassName}
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {clearLabel}
        </Button>
      ) : null}
      {trailingActions ? (
        <div data-hz-search-trailing-actions="detached-secondary" className="flex min-w-0 flex-wrap items-center gap-2">
          {trailingActions}
        </div>
      ) : null}
    </form>
  );
}
