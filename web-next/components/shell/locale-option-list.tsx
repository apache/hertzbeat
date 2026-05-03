import React from 'react';
import { useI18n } from '../providers/i18n-provider';
import { cn } from '../../lib/utils';
import type { LOCALES, LocaleCode } from '../../lib/i18n';

type LocaleOptionListProps = {
  locale: LocaleCode;
  locales: typeof LOCALES;
  onSelect: (locale: LocaleCode) => void | Promise<void>;
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
  activeIndicatorClassName?: string;
};

export function LocaleOptionList({
  locale,
  locales,
  onSelect,
  className,
  itemClassName,
  activeItemClassName,
  inactiveItemClassName,
  activeIndicatorClassName,
}: LocaleOptionListProps) {
  const { t } = useI18n();

  return (
    <div className={className}>
      {locales.map(option => (
        <button
          key={option.code}
          type="button"
          className={cn(
            'flex w-full items-center gap-2 text-left transition',
            itemClassName,
            locale === option.code ? activeItemClassName : inactiveItemClassName
          )}
          onClick={() => void onSelect(option.code)}
        >
          <span className="inline-flex min-w-5 items-center justify-center text-[14px] leading-none">
            {option.abbr}
          </span>
          <span className="flex-1">{t(option.labelKey)}</span>
          {locale === option.code ? <span className={activeIndicatorClassName}>✓</span> : null}
        </button>
      ))}
    </div>
  );
}
