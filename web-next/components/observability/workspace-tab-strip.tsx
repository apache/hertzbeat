'use client';

import Link from 'next/link';
import * as React from 'react';
import { cn } from '../../lib/utils';

export type WorkspaceShellTab = {
  key: string;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  onSelect?: () => void;
};

function WorkspaceTabControl({
  tab,
  variant = 'default'
}: {
  tab: WorkspaceShellTab;
  variant?: 'default' | 'card';
}) {
  const className = cn(
    variant === 'card'
      ? 'relative -mb-px inline-flex min-h-[34px] items-center gap-1.5 rounded-t-[6px] border border-b-0 px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150'
      : 'inline-flex min-h-[30px] items-center gap-1.5 rounded-[2px] border px-2.5 py-1 text-[12px] font-semibold transition-colors duration-150',
    variant === 'card'
      ? tab.active
        ? 'border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
        : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]'
      : tab.active
        ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
        : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]',
    tab.disabled && 'pointer-events-none opacity-50'
  );

  const content = (
    <>
      <span>{tab.label}</span>
      {tab.badge ? (
        <span className="inline-flex min-h-[18px] items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-1.5 text-[10px] font-medium text-[var(--ops-text-tertiary)]">
          {tab.badge}
        </span>
      ) : null}
    </>
  );

  if (tab.href && !tab.disabled) {
    return (
      <Link className={className} href={tab.href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} disabled={tab.disabled} type="button" onClick={tab.onSelect}>
      {content}
    </button>
  );
}

export function WorkspaceTabStrip({
  tabs,
  ariaLabel = 'Workspace navigation',
  className,
  variant = 'default'
}: {
  tabs: WorkspaceShellTab[];
  ariaLabel?: string;
  className?: string;
  variant?: 'default' | 'card';
}) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        variant === 'card' ? 'flex flex-wrap gap-1.5 border-b border-[var(--ops-border-color)]' : 'flex flex-wrap gap-1.5',
        className
      )}
      data-observability-workspace-tab-strip="true"
    >
      {tabs.map(tab => (
        <WorkspaceTabControl key={tab.key} tab={tab} variant={variant} />
      ))}
    </nav>
  );
}
