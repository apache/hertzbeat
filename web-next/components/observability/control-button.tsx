'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type ObservabilityControlButtonVariant = 'default' | 'plain';

export function ObservabilityControlButton({
  children,
  selected = false,
  disabled = false,
  tone = 'default',
  variant = 'default',
  className,
  onClick,
  ...props
}: {
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'deck' | 'operator';
  variant?: ObservabilityControlButtonVariant;
  className?: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'disabled' | 'onClick' | 'type'>) {
  const isPlain = variant === 'plain';
  const selectedClassName = isPlain
    ? 'text-[var(--ops-text-primary)]'
    : 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]';
  const idleClassName = disabled
    ? isPlain
      ? 'text-[var(--ops-text-tertiary)]'
      : 'border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)]'
    : isPlain
      ? 'text-[var(--ops-text-tertiary)] hover:text-[var(--ops-text-primary)]'
      : 'border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-panel)] hover:text-[var(--ops-text-primary)]';
  const classNameValue = cn(
    'inline-flex items-center rounded-[2px] font-medium transition-colors',
    isPlain ? 'border-0 bg-transparent px-0 py-0' : 'border px-3 py-1.5',
    tone === 'default' && 'text-xs tracking-[0.02em]',
    tone === 'deck' && 'text-[11px] uppercase tracking-[0.12em]',
    tone === 'operator' && 'text-[11px] tracking-[0.03em]',
    selected ? selectedClassName : idleClassName,
    disabled && 'cursor-not-allowed opacity-40',
    className
  );

  return (
    <button
      type="button"
      disabled={disabled}
      className={classNameValue}
      data-observability-control-button-variant={isPlain ? 'plain' : undefined}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
