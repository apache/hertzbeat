'use client';

import Link from 'next/link';
import * as React from 'react';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { cn } from '../../lib/utils';

export type SettingsConsoleMenuItem = {
  href: string;
  label: string;
};

const coldSettingsVisual = coldOpsCatalogVisual;

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
      data-settings-console-surface="otlp-cold-settings-console"
      data-settings-console-style-baseline={coldSettingsVisual.canvasName}
      data-settings-console-route-contract="angular-settings-shell"
      data-settings-console-menu-contract="angular-config-server-object-store-token"
      data-settings-console-menu-mode-contract="angular-inline-horizontal-responsive"
      data-settings-console-active-title-contract="angular-active-child-title"
      className={cn(coldSettingsVisual.canvas.root, className)}
      style={coldSettingsVisual.canvas.backgroundStyle}
    >
      <section className={coldSettingsVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          {kicker || title || subtitle ? (
            <header data-settings-console-header="cold-compact-header" className={cn(coldSettingsVisual.panel.hero, 'mb-5')}>
              {kicker ? <div className="text-[11px] font-semibold tracking-[0.12em] text-[#858d9a]">{kicker}</div> : null}
              {title ? (
                <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#f5f7fb]">{title}</h1>
              ) : null}
              {subtitle ? <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">{subtitle}</p> : null}
            </header>
          ) : null}
          <div
            data-settings-console-main="cold-settings-workspace"
            className="grid min-h-[600px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"
          >
            <aside
              data-settings-console-menu="cold-static-list"
              data-settings-console-menu-mode="angular-responsive-inline-horizontal"
              className="self-start overflow-x-auto rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)] lg:overflow-hidden"
            >
              <nav aria-label={navigationLabel} className="flex min-w-max flex-row gap-2 p-2 lg:min-w-0 lg:flex-col">
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
                        'flex min-h-[36px] shrink-0 items-center rounded-[3px] border px-3 text-[12px] font-semibold leading-5 transition-colors duration-150 lg:shrink',
                        active
                          ? 'border-[#4e74f8] bg-[#121a2a] text-[#eef2f7]'
                          : 'border-[#2b3039] bg-[#101217] text-[#a9b0bb] hover:border-[#3f4654] hover:bg-[#151820] hover:text-[#eef2f7]'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
            <section
              data-settings-console-content="cold-settings-content"
              data-settings-console-active-title={activeItem?.label ?? ''}
              aria-label={contentLabel}
              className="min-w-0 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-5 py-5 shadow-[0_20px_56px_rgba(0,0,0,0.32)] md:px-6"
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
  return <div className={cn('mb-4 text-[15px] font-semibold leading-6 text-[#eef2f7]', className)}>{children}</div>;
}
