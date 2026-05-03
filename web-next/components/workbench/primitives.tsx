'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { CodePane as ObservabilityCodePane } from '../observability/code-pane';
import { TemplateRow } from '../observability/editor-rows';
export { ObservabilityPageHeader as PageHeader } from '../observability/page-header';
import { ObservabilityPanelShell } from '../observability/panel-shell';
import { ObservabilityRailShell } from '../observability/rail-shell';
export { ObservabilityStatusState as StatusState } from '../observability/status-state';
export { TemplateRow };

export type WorkbenchDensity = 'default' | 'compact';
export type WorkbenchSurfaceDensity = 'default' | 'compact' | 'dense';
export type WorkbenchPanelDensity = 'default' | 'compact' | 'flush';
export type WorkbenchPanelVariant = 'default' | 'flat';
export type WorkbenchPanelTone = 'panel' | 'raised' | 'elevated';
export type WorkbenchInsetDensity = 'default' | 'spacious' | 'flush';
export type WorkbenchPillSize = 'default' | 'compact';
export type WorkbenchSelectableCardDensity = 'default' | 'spacious';
export type WorkbenchActionButtonHoverTone = 'raised' | 'elevated';
export type WorkbenchToolbarActionSize = 'default' | 'compact';
export type WorkbenchControlChipSize = 'default' | 'compact' | 'micro';
export type WorkbenchControlChipVariant = 'default' | 'underline';
export type WorkbenchBadgeSize = 'compact' | 'micro' | 'token';
export type WorkbenchBadgeTone = 'secondary' | 'tertiary';
export type PayloadPreviewDensity = 'default' | 'compact';
export type PayloadPreviewTone = 'raised' | 'panel';

type WorkbenchPanelOwnProps<T extends React.ElementType> = {
  as?: T;
  density?: WorkbenchPanelDensity;
  variant?: WorkbenchPanelVariant;
  tone?: WorkbenchPanelTone;
};

type WorkbenchInsetPanelOwnProps<T extends React.ElementType> = {
  as?: T;
  density?: WorkbenchInsetDensity;
  tone?: WorkbenchPanelTone;
};

type WorkbenchPillButtonOwnProps<T extends React.ElementType> = {
  as?: T;
  active?: boolean;
  size?: WorkbenchPillSize;
};

type WorkbenchSelectableCardOwnProps<T extends React.ElementType> = {
  as?: T;
  active?: boolean;
  density?: WorkbenchSelectableCardDensity;
};

type WorkbenchActionButtonOwnProps<T extends React.ElementType> = {
  as?: T;
  hoverTone?: WorkbenchActionButtonHoverTone;
};

type WorkbenchToolbarActionOwnProps<T extends React.ElementType> = {
  as?: T;
  size?: WorkbenchToolbarActionSize;
};

type WorkbenchValuePillOwnProps<T extends React.ElementType> = {
  as?: T;
};

type WorkbenchFormControlOwnProps<T extends React.ElementType> = {
  as?: T;
};

type WorkbenchEditorFieldOwnProps<T extends React.ElementType> = {
  as?: T;
};

type WorkbenchControlChipOwnProps<T extends React.ElementType> = {
  as?: T;
  active?: boolean;
  size?: WorkbenchControlChipSize;
  variant?: WorkbenchControlChipVariant;
};

type WorkbenchBadgeOwnProps<T extends React.ElementType> = {
  as?: T;
  size?: WorkbenchBadgeSize;
  tone?: WorkbenchBadgeTone;
};

type SurfaceSectionProps = React.ComponentProps<typeof ObservabilityPanelShell> & {
  density?: WorkbenchSurfaceDensity;
};

type RailSectionProps = React.ComponentProps<typeof ObservabilityRailShell> & {
  density?: WorkbenchDensity;
};

const surfaceDensityClassNames: Record<WorkbenchSurfaceDensity, string> = {
  default: 'rounded-[10px] px-4 py-3 shadow-none',
  compact: 'rounded-[6px] px-0 py-0 shadow-none',
  dense: 'rounded-[6px] px-2.5 py-2 shadow-none'
};

const railDensityClassNames: Record<WorkbenchDensity, string> = {
  default: '',
  compact: 'rounded-[6px] px-2.5 py-1.5 shadow-none'
};

const panelDensityClassNames: Record<WorkbenchPanelDensity, string> = {
  default: 'px-3.5 py-3',
  compact: 'px-3.5 py-2.5',
  flush: 'px-0 py-0'
};

const insetDensityClassNames: Record<WorkbenchInsetDensity, string> = {
  default: 'p-3',
  spacious: 'p-3.5',
  flush: 'px-0 py-0'
};

const pillSizeClassNames: Record<WorkbenchPillSize, string> = {
  default: 'px-3 py-1.5 text-[11px] font-medium tracking-[0.12em]',
  compact: 'px-2.5 py-1 text-[11px]'
};

const selectableCardDensityClassNames: Record<WorkbenchSelectableCardDensity, string> = {
  default: 'px-3 py-3',
  spacious: 'px-3.5 py-3.5'
};

const actionButtonHoverToneClassNames: Record<WorkbenchActionButtonHoverTone, string> = {
  raised: 'hover:bg-[var(--ops-surface-raised)]',
  elevated: 'hover:bg-[var(--ops-surface-elevated)]'
};

const toolbarActionSizeClassNames: Record<WorkbenchToolbarActionSize, string> = {
  default: 'h-8 px-3 font-medium',
  compact: 'min-h-7 px-2'
};

const controlChipSizeClassNames: Record<WorkbenchControlChipSize, string> = {
  default: 'h-8 px-3 text-[12px] font-medium tracking-[0.03em]',
  compact: 'px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em]',
  micro: 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]'
};

const badgeSizeClassNames: Record<WorkbenchBadgeSize, string> = {
  compact: 'px-2.5 py-1 text-[11px] font-medium tracking-[0.12em]',
  micro: 'px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em]',
  token: 'px-2.5 py-1 text-xs'
};

const badgeToneClassNames: Record<WorkbenchBadgeTone, string> = {
  secondary: 'text-[var(--ops-text-secondary)]',
  tertiary: 'text-[var(--ops-text-tertiary)]'
};

const payloadPreviewDensityClassNames: Record<PayloadPreviewDensity, string> = {
  default: 'rounded-[10px]',
  compact: 'rounded-[6px] p-3.5 text-xs leading-5.5'
};

const payloadPreviewToneClassNames: Record<PayloadPreviewTone, string> = {
  raised: 'bg-[var(--ops-surface-raised)]',
  panel: 'bg-[var(--ops-surface-panel)]'
};

const panelToneClassNames: Record<WorkbenchPanelTone, string> = {
  panel: 'bg-[var(--ops-surface-panel)]',
  raised: 'bg-[var(--ops-surface-raised)]',
  elevated: 'bg-[var(--ops-surface-elevated)]'
};

export function WorkbenchPanel<T extends React.ElementType = 'div'>({
  as,
  className,
  density = 'default',
  variant = 'default',
  tone = 'panel',
  ...props
}: WorkbenchPanelOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchPanelOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'div') as React.ElementType;

  return (
    <Component
      className={cn(
        variant === 'default'
          ? ['rounded-[10px] border border-[var(--ops-border-color)]', panelToneClassNames[tone], panelDensityClassNames[density]]
          : 'rounded-none border-x-0 border-b-0 border-t border-[var(--ops-border-color)] bg-transparent px-0 py-0',
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchInsetPanel<T extends React.ElementType = 'div'>({
  as,
  className,
  density = 'default',
  tone = 'panel',
  ...props
}: WorkbenchInsetPanelOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchInsetPanelOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'div') as React.ElementType;

  return (
    <Component
      className={cn(
        'rounded-[6px] border border-[var(--ops-border-color)]',
        panelToneClassNames[tone],
        insetDensityClassNames[density],
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchTableFrame<T extends React.ElementType = 'div'>({
  as,
  className,
  variant = 'default',
  tone = 'panel',
  ...props
}: Omit<WorkbenchInsetPanelOwnProps<T>, 'density'> &
  { variant?: WorkbenchPanelVariant } &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchInsetPanelOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'div') as React.ElementType;

  return (
    <Component
      className={cn(
        'overflow-x-auto',
        variant === 'default'
          ? ['rounded-[6px] border border-[var(--ops-border-color)]', panelToneClassNames[tone]]
          : 'rounded-none border-x-0 border-b-0 border-t border-[var(--ops-border-color)] bg-transparent',
        insetDensityClassNames.flush,
        className
      )}
      {...props}
    />
  );
}

export const WorkbenchFullscreenShell = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
        className
      )}
      {...props}
    />
  )
);

WorkbenchFullscreenShell.displayName = 'WorkbenchFullscreenShell';

export function WorkbenchPillButton<T extends React.ElementType = 'button'>({
  as,
  active = false,
  size = 'default',
  className,
  ...props
}: WorkbenchPillButtonOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchPillButtonOwnProps<T> | 'className'> & {
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

export function WorkbenchSelectableCard<T extends React.ElementType = 'button'>({
  as,
  active = false,
  density = 'default',
  className,
  ...props
}: WorkbenchSelectableCardOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchSelectableCardOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'button') as React.ElementType;

  return (
    <Component
      className={cn(
        'rounded-[6px] border text-left transition-colors',
        selectableCardDensityClassNames[density],
        active
          ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
          : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]',
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchActionButton<T extends React.ElementType = 'button'>({
  as,
  hoverTone = 'raised',
  className,
  ...props
}: WorkbenchActionButtonOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchActionButtonOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'button') as React.ElementType;

  return (
    <Component
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 text-[12px] text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:text-[var(--ops-text-primary)]',
        actionButtonHoverToneClassNames[hoverTone],
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchToolbarAction<T extends React.ElementType = 'button'>({
  as,
  size = 'default',
  className,
  ...props
}: WorkbenchToolbarActionOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchToolbarActionOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'button') as React.ElementType;

  return (
    <Component
      className={cn(
        'inline-flex items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-[12px] text-[var(--ops-text-primary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-elevated)] hover:text-[var(--ops-text-primary)] disabled:cursor-not-allowed disabled:opacity-40',
        toolbarActionSizeClassNames[size],
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchValuePill<T extends React.ElementType = 'span'>({
  as,
  className,
  ...props
}: WorkbenchValuePillOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchValuePillOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'span') as React.ElementType;

  return (
    <Component
      className={cn(
        'inline-flex min-h-7 items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 text-[12px] text-[var(--ops-text-primary)]',
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchFormControl<T extends React.ElementType = 'input'>({
  as,
  className,
  ...props
}: WorkbenchFormControlOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchFormControlOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'input') as React.ElementType;

  return (
    <Component
      className={cn(
        'flex h-8 w-full rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-1.5 text-[12px] text-[var(--ops-text-primary)] shadow-none transition-colors focus-visible:border-[var(--ops-primary)] focus-visible:bg-[var(--ops-surface-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchEditorField<T extends React.ElementType = 'textarea'>({
  as,
  className,
  ...props
}: WorkbenchEditorFieldOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchEditorFieldOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'textarea') as React.ElementType;

  return (
    <Component
      className={cn(
        'min-h-[420px] w-full rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3.5 py-3 font-mono text-sm leading-6 text-[var(--ops-text-secondary)] shadow-none transition-colors focus-visible:border-[var(--ops-primary)] focus-visible:bg-[var(--ops-surface-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        className
      )}
      {...props}
    />
  );
}

export function WorkbenchControlChip<T extends React.ElementType = 'button'>({
  as,
  active = false,
  size = 'default',
  variant = 'default',
  className,
  ...props
}: WorkbenchControlChipOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchControlChipOwnProps<T> | 'className'> & {
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

export function WorkbenchBadge<T extends React.ElementType = 'span'>({
  as,
  size = 'compact',
  tone = 'secondary',
  className,
  ...props
}: WorkbenchBadgeOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof WorkbenchBadgeOwnProps<T> | 'className'> & {
    className?: string;
  }) {
  const Component = (as || 'span') as React.ElementType;

  return (
    <Component
      className={cn(
        'inline-flex items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]',
        badgeSizeClassNames[size],
        badgeToneClassNames[tone],
        className
      )}
      {...props}
    />
  );
}

export function SurfaceSection({ className, density = 'default', variant = 'default', ...props }: SurfaceSectionProps) {
  return (
    <ObservabilityPanelShell
      variant={variant}
      className={cn(variant === 'flat' ? '' : surfaceDensityClassNames[density], className)}
      {...props}
    />
  );
}

export function RailSection({ className, density = 'default', variant = 'default', ...props }: RailSectionProps) {
  return (
    <ObservabilityRailShell
      variant={variant}
      className={cn(variant === 'flat' ? '' : railDensityClassNames[density], className)}
      {...props}
    />
  );
}

export function WorkbenchStack({
  children,
  className,
  density = 'default'
}: {
  children: React.ReactNode;
  className?: string;
  density?: WorkbenchDensity;
}) {
  return <div className={cn(density === 'compact' ? 'space-y-1.5' : 'space-y-3', className)}>{children}</div>;
}

export function PayloadPreview({
  className,
  maxHeight = 'max-h-[420px]',
  density = 'default',
  tone = 'raised',
  ...props
}: React.ComponentProps<typeof ObservabilityCodePane> & {
  density?: PayloadPreviewDensity;
  tone?: PayloadPreviewTone;
}) {
  return (
    <ObservabilityCodePane
      maxHeight={maxHeight}
      className={cn(
        'border border-[var(--ops-border-color)] text-[var(--ops-text-secondary)]',
        payloadPreviewDensityClassNames[density],
        payloadPreviewToneClassNames[tone],
        className
      )}
      {...props}
    />
  );
}
