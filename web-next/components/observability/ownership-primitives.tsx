'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type ObservabilityInsetDensity = 'default' | 'flush';
export type ObservabilityInsetTone = 'panel' | 'raised' | 'elevated';
export type ObservabilityPillSize = 'default' | 'compact';
export type ObservabilityControlChipSize = 'default' | 'compact' | 'micro';
export type ObservabilityControlChipVariant = 'default' | 'underline';
export type ObservabilityBadgeSize = 'compact' | 'micro' | 'token';
export type ObservabilityBadgeTone = 'secondary' | 'tertiary';
export type ObservabilityBadgeVariant = 'default' | 'plain';

type ObservabilityInsetPanelOwnProps<T extends React.ElementType> = {
  as?: T;
  density?: ObservabilityInsetDensity;
  tone?: ObservabilityInsetTone;
};

type ObservabilityPillButtonOwnProps<T extends React.ElementType> = {
  as?: T;
  active?: boolean;
  size?: ObservabilityPillSize;
};

type ObservabilityControlChipOwnProps<T extends React.ElementType> = {
  as?: T;
  active?: boolean;
  size?: ObservabilityControlChipSize;
  variant?: ObservabilityControlChipVariant;
};

type ObservabilityBadgeOwnProps<T extends React.ElementType> = {
  as?: T;
  size?: ObservabilityBadgeSize;
  tone?: ObservabilityBadgeTone;
  variant?: ObservabilityBadgeVariant;
};

const insetDensityClassNames: Record<ObservabilityInsetDensity, string> = {
  default: 'p-3',
  flush: 'px-0 py-0'
};

const pillSizeClassNames: Record<ObservabilityPillSize, string> = {
  default: 'px-3 py-1.5 text-[11px] font-medium tracking-[0.12em]',
  compact: 'px-2.5 py-1 text-[11px]'
};

const controlChipSizeClassNames: Record<ObservabilityControlChipSize, string> = {
  default: 'h-8 px-3 text-[12px] font-medium tracking-[0.03em]',
  compact: 'px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em]',
  micro: 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]'
};

const badgeSizeClassNames: Record<ObservabilityBadgeSize, string> = {
  compact: 'px-2.5 py-1 text-[11px] font-medium tracking-[0.12em]',
  micro: 'px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em]',
  token: 'px-2.5 py-1 text-xs'
};

const badgeToneClassNames: Record<ObservabilityBadgeTone, string> = {
  secondary: 'text-[var(--ops-text-secondary)]',
  tertiary: 'text-[var(--ops-text-tertiary)]'
};

const insetToneClassNames: Record<ObservabilityInsetTone, string> = {
  panel: 'bg-[var(--ops-surface-panel)]',
  raised: 'bg-[var(--ops-surface-raised)]',
  elevated: 'bg-[var(--ops-surface-elevated)]'
};

export function ObservabilityInsetPanel<T extends React.ElementType = 'div'>({
  as,
  className,
  density = 'default',
  tone = 'panel',
  ...props
}: ObservabilityInsetPanelOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ObservabilityInsetPanelOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'div') as React.ElementType;

  return (
    <Component
      className={cn(
        'rounded-[6px] border border-[var(--ops-border-color)]',
        insetToneClassNames[tone],
        insetDensityClassNames[density],
        className
      )}
      {...props}
    />
  );
}

export function ObservabilityPillButton<T extends React.ElementType = 'button'>({
  as,
  active = false,
  size = 'default',
  className,
  ...props
}: ObservabilityPillButtonOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ObservabilityPillButtonOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'button') as React.ElementType;

  return (
    <Component
      className={cn(
        'inline-flex items-center rounded-[999px] border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        pillSizeClassNames[size],
        active
          ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
          : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]',
        className
      )}
      {...props}
    />
  );
}

export function ObservabilityControlChip<T extends React.ElementType = 'button'>({
  as,
  active = false,
  size = 'default',
  variant = 'default',
  className,
  ...props
}: ObservabilityControlChipOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ObservabilityControlChipOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'button') as React.ElementType;

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center rounded-[2px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        controlChipSizeClassNames[size],
        variant === 'underline'
          ? active
            ? 'border-b border-[var(--ops-primary)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)]'
            : 'text-[var(--ops-text-tertiary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text-secondary)]'
          : active
            ? 'border border-[var(--ops-primary)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)]'
            : 'border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text-primary)]',
        className
      )}
      {...props}
    />
  );
}

export function ObservabilityBadge<T extends React.ElementType = 'span'>({
  as,
  size = 'compact',
  tone = 'secondary',
  variant = 'default',
  className,
  ...props
}: ObservabilityBadgeOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof ObservabilityBadgeOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'span') as React.ElementType;

  return (
    <Component
      className={cn(
        variant === 'plain'
          ? 'inline-flex items-center'
          : 'inline-flex items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]',
        badgeSizeClassNames[size],
        badgeToneClassNames[tone],
        className
      )}
      {...props}
    />
  );
}
