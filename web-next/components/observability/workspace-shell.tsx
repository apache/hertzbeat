'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { WorkspaceTabStrip, type WorkspaceShellTab } from './workspace-tab-strip';

type DataAttributeProps = Record<`data-${string}`, string | undefined>;

export function WorkspaceShell({
  kicker,
  title,
  subtitle,
  tabs = [],
  actions,
  main,
  rail,
  showRail = false,
  allowRailCollapse = false,
  railCollapsed = false,
  onRailCollapsedChange,
  collapseRailLabel,
  expandRailLabel,
  footer,
  showFooter = false,
  chrome = 'default',
  railWidth = 'default',
  className,
  surfaceClassName,
  mainClassName,
  railClassName,
  mainProps,
  railProps,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  kicker?: string;
  title: string;
  subtitle?: string;
  tabs?: WorkspaceShellTab[];
  actions?: React.ReactNode;
  main: React.ReactNode;
  rail?: React.ReactNode;
  showRail?: boolean;
  allowRailCollapse?: boolean;
  railCollapsed?: boolean;
  onRailCollapsedChange?: (nextValue: boolean) => void;
  collapseRailLabel?: string;
  expandRailLabel?: string;
  footer?: React.ReactNode;
  showFooter?: boolean;
  chrome?: 'default' | 'plain';
  railWidth?: 'default' | 'wide';
  className?: string;
  surfaceClassName?: string;
  mainClassName?: string;
  railClassName?: string;
  mainProps?: React.HTMLAttributes<HTMLElement> & DataAttributeProps;
  railProps?: React.HTMLAttributes<HTMLElement> & DataAttributeProps;
}) {
  const showExpandedRail = showRail && !railCollapsed && rail != null;
  const railGridClassName =
    railWidth === 'wide'
      ? 'xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]'
      : 'xl:grid-cols-[minmax(0,1fr)_minmax(288px,320px)]';

  return (
    <section
      {...props}
      className={cn('flex min-h-0 flex-col gap-3', className)}
      data-observability-workspace-shell="true"
      data-workspace-shell="true"
    >
      <header
        className="flex flex-col gap-3 border-b border-[var(--ops-border-color)] pb-3 xl:flex-row xl:items-start xl:justify-between"
        data-observability-workspace-shell-header="true"
        data-workspace-shell-header="true"
      >
        <div className="min-w-0 flex-1 space-y-1">
          {kicker ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">
              {kicker}
            </div>
          ) : null}
          <h1 className="text-[22px] font-semibold leading-[1.18] text-[var(--ops-text-primary)]">{title}</h1>
          {subtitle ? (
            <p className="max-w-[88ch] text-[13px] leading-6 text-[var(--ops-text-secondary)]">{subtitle}</p>
          ) : null}
          <WorkspaceTabStrip tabs={tabs} className="pt-1" />
        </div>

        {(actions || (showRail && allowRailCollapse)) ? (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {actions}
            {showRail && allowRailCollapse ? (
              <Button size="sm" variant="subtle" onClick={() => onRailCollapsedChange?.(!railCollapsed)}>
                {railCollapsed ? expandRailLabel : collapseRailLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--ops-border-color)]',
          chrome === 'default'
            ? 'rounded-[10px] bg-[var(--ops-surface-panel)] shadow-[var(--ops-panel-shadow)]'
            : 'rounded-none border-x-0 border-b-0 bg-transparent shadow-none',
          surfaceClassName
        )}
        data-observability-workspace-shell-surface="true"
        data-workspace-shell-surface="true"
      >
        <div
          className={cn(
            'grid min-h-0 flex-1 overflow-hidden',
            showExpandedRail && railGridClassName
          )}
          data-workspace-shell-rail-width={showExpandedRail ? railWidth : undefined}
        >
          <main
            {...mainProps}
            className={cn('min-h-0 min-w-0 overflow-auto bg-[var(--ops-surface-panel)] p-3', mainClassName)}
            data-observability-workspace-shell-main="true"
            data-workspace-shell-main="true"
          >
            {main}
          </main>
          {showExpandedRail ? (
            <aside
              {...railProps}
              className={cn(
                'min-h-0 min-w-0 overflow-auto border-t border-[var(--ops-border-color)] bg-[var(--ops-surface-elevated)] p-3 xl:border-l xl:border-t-0',
                railClassName
              )}
              data-observability-workspace-shell-rail="true"
              data-workspace-shell-rail="true"
            >
              {rail}
            </aside>
          ) : null}
        </div>

        {showFooter ? (
          <footer
            className="border-t border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"
            data-observability-workspace-shell-surface-footer="true"
            data-workspace-shell-surface-footer="true"
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
}

export type { WorkspaceShellTab };
