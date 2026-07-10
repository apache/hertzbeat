'use client';

import Link from 'next/link';
import * as React from 'react';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { cn } from '../../lib/utils';

export type SettingsConsoleMenuItem = {
  href: string;
  label: string;
};

const hzSettingsVisual = hzOpsCatalogVisual;

export function SettingsConsoleShell({
  items,
  activeHref,
  children,
  className,
  contentLabel,
  kicker,
  navigationLabel,
  title,
  subtitle
}: {
  items: SettingsConsoleMenuItem[];
  activeHref?: string | null;
  children: React.ReactNode;
  className?: string;
  contentLabel?: string;
  kicker?: string;
  navigationLabel?: string;
  title?: string;
  subtitle?: string;
}) {
  const activeItem = items.find(item => item.href === activeHref) ?? items[0] ?? null;

  return (
    <div
      data-settings-console-surface="hertzbeat-ui-settings-console"
      data-settings-console-style-baseline={hzSettingsVisual.canvasName}
      data-settings-console-route-contract="angular-settings-shell"
      data-settings-console-menu-contract="angular-config-server-object-store-token"
      data-settings-console-menu-mode-contract="angular-inline-horizontal-responsive"
      data-settings-console-active-title-contract="angular-active-child-title"
      data-settings-console-visual-direction="flat-operations-canvas"
      data-settings-console-card-contract="flat-no-outer-card"
      className={cn(hzSettingsVisual.canvas.root, 'w-full min-w-0', className)}
      style={hzSettingsVisual.canvas.backgroundStyle}
    >
      <section className={cn(hzSettingsVisual.layout.pageSection, 'w-full min-w-0')}>
        <div className="mx-auto w-full max-w-[1480px] min-w-0">
          {kicker || title || subtitle ? (
            <header
              data-settings-console-header="hertzbeat-ui-compact-header"
              className="border-b border-[#2b3039] pb-6"
            >
              {kicker ? <div className="text-[11px] font-semibold tracking-[0.12em] text-[#858d9a]">{kicker}</div> : null}
              {title ? (
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
              ) : null}
              {subtitle ? <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">{subtitle}</p> : null}
            </header>
          ) : null}
          <div
            data-settings-console-main="hertzbeat-ui-settings-workspace"
            data-settings-console-stacked-density-contract="natural-height-before-two-column-layout"
            className="grid lg:min-h-[600px] lg:grid-cols-[220px_minmax(0,1fr)]"
          >
            <aside
              data-settings-console-menu="hertzbeat-ui-static-list"
              data-settings-console-menu-mode="angular-responsive-inline-horizontal"
              data-settings-console-menu-scroll-hint="horizontal-on-narrow-viewports"
              className="self-start overflow-x-auto border-b border-[#2b3039] bg-transparent pb-1 lg:min-h-[600px] lg:overflow-hidden lg:border-b-0 lg:border-r lg:pb-0"
            >
              <nav aria-label={navigationLabel} className="flex min-w-max flex-row gap-1 py-2 lg:min-w-0 lg:flex-col lg:gap-1 lg:py-5 lg:pr-5">
                {items.map(item => {
                  const active = item.href === activeHref;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      data-settings-console-menu-item={item.href}
                      data-settings-console-active={active ? 'true' : undefined}
                      data-settings-console-selected-contract={active ? 'angular-nz-selected' : undefined}
                      className={cn(
                        'relative flex min-h-[40px] shrink-0 items-center border-0 bg-transparent px-3 text-[12px] font-semibold leading-5 transition-colors duration-150 before:absolute before:bg-[#4e74f8] before:opacity-0 lg:shrink',
                        active
                          ? 'text-[#6f8fff] before:inset-x-3 before:bottom-0 before:h-[2px] before:opacity-100 lg:before:inset-y-2 lg:before:left-0 lg:before:right-auto lg:before:h-auto lg:before:w-[2px]'
                          : 'text-[#a9b0bb] hover:bg-[#101217] hover:text-[#eef2f7]'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
            <section
              data-settings-console-content="hertzbeat-ui-settings-content"
              data-settings-console-active-title={activeItem?.label ?? ''}
              aria-label={contentLabel}
              className="min-w-0 bg-transparent py-5 lg:px-8 lg:py-8"
            >
              <div hidden data-settings-console-active-title-marker={activeItem?.label ?? ''} />
              {children}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SettingsConsoleTitle({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('mb-5 text-[20px] font-semibold leading-7 text-[#eef2f7]', className)}>{children}</div>;
}
