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
  kicker,
  title,
  subtitle
}: {
  items: SettingsConsoleMenuItem[];
  activeHref?: string | null;
  children: React.ReactNode;
  className?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      data-settings-console-surface="otlp-cold-settings-console"
      data-settings-console-style-baseline={coldSettingsVisual.canvasName}
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
              className="self-start overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
            >
              <nav className="flex flex-col gap-2 p-2">
                {items.map(item => {
                  const active = item.href === activeHref;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      data-settings-console-menu-item={item.href}
                      data-settings-console-active={active ? 'true' : undefined}
                      className={cn(
                        'flex min-h-[36px] items-center rounded-[3px] border px-3 text-[12px] font-semibold leading-5 transition-colors duration-150',
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
              className="min-w-0 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-5 py-5 shadow-[0_20px_56px_rgba(0,0,0,0.32)] md:px-6"
            >
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
