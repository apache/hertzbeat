import React from 'react';
import { HzLocaleMenuOption } from '@hertzbeat/ui';
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
        <HzLocaleMenuOption
          key={option.code}
          abbr={option.abbr}
          label={t(option.labelKey)}
          selected={locale === option.code}
          className={cn(
            itemClassName,
            locale === option.code ? activeItemClassName : inactiveItemClassName
          )}
          indicatorClassName={activeIndicatorClassName}
          onClick={() => void onSelect(option.code)}
          data-app-frame-locale-option={option.code}
        />
      ))}
    </div>
  );
}
