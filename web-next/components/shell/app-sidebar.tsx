import * as React from 'react';
import Link from 'next/link';
import { buildShellSidebarSections } from '../../lib/shell/sidebar';
import { cn } from '../../lib/utils';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function AppSidebar({ pathname, t }: { pathname: string; t: Translator }) {
  const sections = buildShellSidebarSections(pathname, t);

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden border-b border-[var(--ops-border-color)] bg-[var(--ops-background)] py-0 lg:h-[calc(100vh-64px)] lg:border-b-0 lg:border-r"
      data-app-sidebar="true"
      data-app-sidebar-scroll-owner="bounded-sidebar-nav"
      data-app-sidebar-visual="left-rail-primary-nav"
    >
      <nav className="mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 pb-2" data-app-sidebar-nav="true">
        {sections.map(section => (
          <section key={section.key}>
            <div className="mb-0.5 px-3 text-[10px] tracking-[0.12em] text-[var(--ops-text-tertiary)]">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map(item => (
                <Link
                  href={item.href}
                  key={item.key}
                  data-shell-nav-item={item.key}
                  data-shell-nav-item-active={item.active ? 'true' : 'false'}
                  data-shell-nav-visual="left-rail"
                  className={cn(
                    'group grid min-h-8 grid-cols-[3px_18px_minmax(0,1fr)] items-center gap-2 px-0 pr-2 transition-colors duration-150',
                    item.active
                      ? 'text-[var(--ops-text-primary)]'
                      : 'text-[var(--ops-text-secondary)] hover:text-[var(--ops-text-primary)]'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-5 w-[2px] justify-self-start bg-transparent transition-colors',
                      item.active
                        ? 'bg-[var(--hz-ui-accent)]'
                        : 'group-hover:bg-[var(--ops-border-strong)]'
                    )}
                    data-shell-nav-active-rail={item.active ? 'true' : 'false'}
                  />
                  <span
                    data-shell-nav-icon-key={item.iconKey}
                    data-shell-nav-icon-role="line-art"
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center transition-colors',
                      item.active
                        ? 'text-[var(--ops-text-primary)]'
                        : 'text-[var(--ops-text-tertiary)] group-hover:text-[var(--ops-text-primary)]'
                    )}
                  >
                    <item.Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium leading-5">{item.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
