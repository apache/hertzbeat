'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export {
  PassportPanel,
  PassportPanel as ParityAuthPanel,
  PassportShell,
  PassportShell as ParityAuthShell
} from '../pages/passport-shell';
export { PublicStatusShell, PublicStatusShell as ParityPublicShell } from '../pages/public-status-shell';
export {
  SettingsConsoleShell,
  SettingsConsoleShell as ParitySettingsConsoleShell
} from '../settings/settings-console-shell';
export { SettingsForm } from '../settings/settings-form';
export {
  PageHeader,
  PayloadPreview,
  RailSection,
  StatusState,
  SurfaceSection,
  TemplateRow,
  WorkbenchStack
} from '../workbench/primitives';
export {
  FieldWrapper,
  ToolbarField,
  ToolbarGroup,
  ToolbarInput,
  ToolbarNativeSelect,
  ToolbarRow
} from '../workbench/toolbar';
export { OverlayDialog as ParityDialogShell } from '../workbench/overlay-dialog';
export { WorkspaceShell } from '../workbench/workspace-shell';

export function ParityAppShellFrame({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('hb-shell min-h-screen bg-transparent', className)} data-parity-app-shell="true">
      {children}
    </div>
  );
}

export function ParityAppHeader({
  kicker,
  title,
  subtitle,
  actions,
  tabs,
  className
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-[var(--ops-border-color)] pb-3 xl:flex-row xl:items-start xl:justify-between',
        className
      )}
      data-parity-app-header="true"
    >
      <div className="min-w-0 flex-1">
        {kicker ? <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{kicker}</div> : null}
        <div className="mt-1 text-[22px] font-semibold leading-[1.18] text-[var(--ops-text-primary)]">{title}</div>
        {subtitle ? <div className="mt-1 text-[13px] leading-6 text-[var(--ops-text-secondary)]">{subtitle}</div> : null}
        {tabs ? <div className="pt-2">{tabs}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function ParitySectionHeader({
  kicker,
  title,
  subtitle,
  actions,
  className
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-[var(--ops-border-color)] pb-3 xl:flex-row xl:items-start xl:justify-between',
        className
      )}
      data-parity-section-header="true"
    >
      <div className="min-w-0 flex-1">
        {kicker ? <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-tertiary)]">{kicker}</div> : null}
        <div className="mt-1 text-[22px] font-semibold leading-[1.18] text-[var(--ops-text-primary)]">{title}</div>
        {subtitle ? <div className="mt-1 text-[13px] leading-6 text-[var(--ops-text-secondary)]">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function ParityActionRow({
  children,
  className,
  align = 'start'
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'between';
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-between',
        className
      )}
      data-parity-action-row="true"
    >
      {children}
    </div>
  );
}

export function ParityToolbarRow({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-2 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2',
        className
      )}
      data-parity-toolbar-row="true"
    >
      {children}
    </div>
  );
}

export function ParityOperatorLayout({
  toolbar,
  main,
  rail,
  className,
  mainClassName,
  railClassName
}: {
  toolbar?: React.ReactNode;
  main: React.ReactNode;
  rail?: React.ReactNode;
  className?: string;
  mainClassName?: string;
  railClassName?: string;
}) {
  const hasRail = Boolean(rail);

  return (
    <section className={cn('flex flex-col gap-3', className)} data-parity-operator-layout="true">
      {toolbar ? toolbar : null}
      <div
        className={cn(
          'grid gap-3',
          hasRail && 'xl:grid-cols-[minmax(0,1fr)_minmax(288px,320px)]'
        )}
        data-parity-operator-surface="true"
      >
        <main
          className={cn(
            'min-w-0 rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-4 py-3',
            mainClassName
          )}
          data-parity-operator-main="true"
        >
          {main}
        </main>
        {rail ? (
          <aside
            className={cn(
              'min-w-0 rounded-[10px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-elevated)] px-4 py-3',
              railClassName
            )}
            data-parity-operator-rail="true"
          >
            {rail}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

export function ParityDialogActions({
  children,
  className,
  align = 'end'
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'between';
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-t border-[var(--ops-border-color)] pt-4',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-between',
        className
      )}
      data-parity-dialog-actions="true"
    >
      {children}
    </div>
  );
}

export function ParityFormStack({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn('rounded-[16px] border border-white/8 bg-[#111315] px-4 py-3.5 shadow-none', className)}
      data-parity-form-stack="true"
    >
      <ParitySectionHeader title={title} subtitle={description} actions={actions} />
      <div
        className={cn(
          'mt-3 flex flex-col gap-3 rounded-[12px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/78',
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function ParityTableShell({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn('rounded-[16px] border border-white/8 bg-[#111315] px-4 py-3.5 shadow-none', className)}
      data-parity-table-shell="true"
    >
      <ParitySectionHeader title={title} subtitle={subtitle} actions={actions} />
      <div className={cn('mt-3 overflow-hidden rounded-[10px] border border-white/8 bg-black/20', bodyClassName)}>{children}</div>
    </section>
  );
}

export function ParityPlaceholderShell({
  title,
  subtitle,
  actions,
  children,
  className
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-[16px] border border-white/8 bg-[#111315] px-4 py-3.5 shadow-none', className)}
      data-parity-placeholder-shell="true"
    >
      <ParitySectionHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="mt-3 rounded-[12px] border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-white/62">
        {children}
      </div>
    </section>
  );
}
