import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DataAttributeProps = Record<`data-${string}`, string | undefined>;

export type HzSourceDocShellSource = {
  id: string;
  label: React.ReactNode;
  href: string;
  iconSrc?: string;
  iconAlt?: string;
  selected?: boolean;
  itemProps?: React.AnchorHTMLAttributes<HTMLAnchorElement> & DataAttributeProps;
  iconProps?: React.ImgHTMLAttributes<HTMLImageElement> & DataAttributeProps;
};

export type HzSourceDocShellProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sourceRailLabel: React.ReactNode;
  sourceItems: HzSourceDocShellSource[];
  children: React.ReactNode;
  actions?: React.ReactNode;
  docTitle?: React.ReactNode;
  sourceLinkComponent?: React.ElementType<any>;
};

export function HzSourceDocShell({
  eyebrow,
  title,
  sourceRailLabel,
  sourceItems,
  children,
  actions,
  docTitle,
  sourceLinkComponent: SourceLinkComponent = 'a',
  className,
  ...props
}: HzSourceDocShellProps) {
  return (
    <div
      {...props}
      className={cn('space-y-5 bg-[#0b0c0e] text-[#f2f5f8]', className)}
      data-hz-ui="source-doc-shell"
      data-hz-source-doc-shell-owner="hertzbeat-ui-source-doc-shell"
      data-hz-source-doc-shell-density="operator-compact"
    >
      <header className="grid gap-4 pb-1 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end" data-hz-source-doc-shell-region="header">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 xl:justify-end" data-hz-source-doc-shell-region="actions">
            <span className="hidden text-[11px] font-semibold text-[#7e8494] md:inline-flex">{sourceRailLabel}</span>
            {actions}
          </div>
        ) : null}
      </header>

      <section
        className="grid min-h-[640px] overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)] xl:grid-cols-[220px_minmax(0,1fr)]"
        data-hz-source-doc-shell-owner="hertzbeat-ui-source-doc-shell"
        data-hz-source-doc-shell-region="body"
      >
        <aside
          className="border-b border-[#252b34] bg-[#0b0c0e] px-3 py-4 xl:border-b-0 xl:border-r"
          data-hz-source-doc-rail-owner="hertzbeat-ui-source-doc-shell"
        >
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]">
            {sourceRailLabel}
          </h2>
          <nav className="space-y-1" aria-label={typeof sourceRailLabel === 'string' ? sourceRailLabel : undefined}>
            {sourceItems.map(item => {
              const { className: itemClassName, ...itemProps } = item.itemProps ?? {};
              const { className: iconClassName, ...iconProps } = item.iconProps ?? {};
              return (
                <SourceLinkComponent
                  key={item.id}
                  href={item.href}
                  {...itemProps}
                  className={cn(
                    'flex h-9 items-center rounded-[3px] border px-2.5 text-[12px] font-semibold transition-colors',
                    item.selected
                      ? 'border-[#31405c] bg-[#182238] text-[#d8e4ff]'
                      : 'border-transparent text-[#858d9a] hover:border-[#303743] hover:bg-[#101217] hover:text-[#eef2f7]',
                    itemClassName
                  )}
                  data-hz-source-doc-item-owner="hertzbeat-ui-source-doc-shell"
                  data-hz-source-doc-item-selected={item.selected ? 'true' : 'false'}
                >
                  {item.iconSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- shared UI package cannot depend on Next Image; callers provide already-sized provider icons.
                    <img
                      src={item.iconSrc}
                      alt={item.iconAlt ?? ''}
                      aria-hidden={item.iconAlt ? undefined : 'true'}
                      {...iconProps}
                      className={cn('mr-2.5 h-5 w-5 shrink-0 object-contain', iconClassName)}
                      data-hz-source-doc-item-icon-owner="hertzbeat-ui-source-doc-shell"
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{item.label}</span>
                </SourceLinkComponent>
              );
            })}
          </nav>
        </aside>

        <div
          className="hb-scrollbar min-w-0 overflow-auto px-6 py-5"
          data-hz-source-doc-panel-owner="hertzbeat-ui-source-doc-shell"
          data-hz-source-doc-panel-scroll-owner="hertzbeat-ui-scroll-viewport"
        >
          {docTitle ? <h2 className="mb-4 text-[22px] font-semibold leading-tight text-[#f5f7fb]">{docTitle}</h2> : null}
          {children}
        </div>
      </section>
    </div>
  );
}
