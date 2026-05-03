'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function ObservabilityPanelShell({
  title,
  description,
  copy,
  actions,
  children,
  variant = 'default',
  tone = 'default',
  className = '',
  contentClassName = ''
}: {
  title: string;
  description?: string;
  copy?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'flat';
  tone?: 'default' | 'deck' | 'operator';
  className?: string;
  contentClassName?: string;
}) {
  const resolvedDescription = description ?? copy;
  return (
    <section data-observability-panel-tone={tone === 'operator' ? 'operator-sheet' : undefined}>
      <Card
        className={cn(
          tone === 'default' && 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] shadow-none',
          tone === 'deck' && 'rounded-none border-x-0 border-b-0 border-t border-[var(--ops-border-color)] bg-transparent shadow-none',
          tone === 'operator' && 'rounded-none border-x-0 border-b-0 border-t border-[var(--ops-border-color)] bg-transparent shadow-none',
          variant === 'flat' && 'rounded-none border-x-0 border-b-0 bg-transparent shadow-none',
          className
        )}
      >
        <CardHeader
          className={cn(
            'pb-4',
            tone === 'deck' && 'px-0 pb-3 pt-0',
            tone === 'operator' && 'px-0 pb-2.5 pt-0',
            variant === 'flat' && 'px-0 pb-3 pt-3'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle
                className={cn(
                  tone === 'deck' && 'text-[13px] font-semibold tracking-[0.03em] text-[var(--ops-text-primary)]',
                  tone === 'operator' && 'text-[13px] font-semibold tracking-[0.02em] text-[var(--ops-text-primary)]',
                  variant === 'flat' && 'text-base text-[var(--ops-text-primary)]'
                )}
              >
                {title}
              </CardTitle>
              {resolvedDescription ? (
                <CardDescription
                  className={cn(
                    tone === 'deck' && 'mt-1 text-[12px] leading-5 text-[var(--ops-text-secondary)]',
                    tone === 'operator' && 'mt-1 text-[12px] leading-5 text-[var(--ops-text-secondary)]',
                    variant === 'flat' && 'text-[13px] leading-5 text-[var(--ops-text-secondary)]'
                  )}
                >
                  {resolvedDescription}
                </CardDescription>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            tone === 'deck' || tone === 'operator' ? 'px-0 pb-0 pt-0' : 'pt-0',
            variant === 'flat' && 'px-0 pb-0 pt-0',
            contentClassName
          )}
        >
          {children}
        </CardContent>
      </Card>
    </section>
  );
}
