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
                  className={cn(
                    'group flex items-center gap-2 rounded-[2px] px-3 py-1.5 transition-colors duration-150',
                    item.active
                      ? 'bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
                      : 'text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-panel)] hover:text-[var(--ops-text-primary)]'
                  )}
                >
                  <span
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
