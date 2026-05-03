'use client';

import React, { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type ObservabilitySelectableCard = {
  key: string;
  title: string;
  copy: string;
  meta?: string;
  extra?: ReactNode;
};

export function ObservabilitySelectableCardGrid({
  cards,
  selectedKey,
  onSelect,
  columns = 2,
  tone = 'default',
}: {
  cards: ObservabilitySelectableCard[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  columns?: 1 | 2;
  tone?: 'default' | 'deck' | 'operator';
}) {
  const containerClass = tone === 'deck' ? 'grid gap-x-6 gap-y-0.5' : tone === 'operator' ? 'grid gap-x-8 gap-y-0' : 'grid gap-3';

  return (
    <div className={cn(containerClass, columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1')}>
      {cards.map(card => {
        const active = card.key === selectedKey;
        return (
          <div
            key={card.key}
            data-card-selected={active ? 'true' : 'false'}
            className={cn(
              tone === 'deck'
                ? 'relative border-b border-[var(--ops-border-color)] px-0 py-2.5 transition'
                : tone === 'operator'
                  ? 'relative border-b border-[var(--ops-border-color)] px-0 py-3 transition'
                : 'relative rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-3 transition',
              tone === 'deck'
                ? active
                  ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)]'
                  : 'hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-panel)]'
                : tone === 'operator'
                  ? active
                    ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)]'
                    : 'hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-panel)]'
                : active
                  ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)]'
                  : 'hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)]'
            )}
          >
            <div
              className={cn(
                tone === 'deck' ? 'absolute bottom-2.5 left-0 top-2.5 w-px transition' : 'absolute bottom-3 left-0 top-3 w-px transition',
                active
                  ? 'bg-[var(--ops-primary)]'
                  : 'bg-transparent'
              )}
            />
            <button
              type="button"
              className={cn(
                'w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.18)]',
                tone === 'deck' ? 'space-y-1.5 pl-3' : tone === 'operator' ? 'space-y-1.5 pl-3' : 'space-y-2 pl-1'
              )}
              onClick={() => onSelect(card.key)}
            >
              <div
                className={
                  tone === 'deck'
                    ? 'text-[12.5px] font-semibold text-[var(--ops-text-primary)]'
                    : tone === 'operator'
                      ? 'text-[13px] font-semibold text-[var(--ops-text-primary)]'
                      : 'text-[13px] font-semibold text-[var(--ops-text-primary)]'
                }
              >
                {card.title}
              </div>
              <div
                className={
                  tone === 'deck'
                    ? 'text-[12px] leading-5 text-[var(--ops-text-secondary)]'
                    : tone === 'operator'
                      ? 'text-[12px] leading-5 text-[var(--ops-text-secondary)]'
                      : 'text-[12px] leading-5 text-[var(--ops-text-secondary)]'
                }
              >
                {card.copy}
              </div>
              {card.meta ? (
                <div
                  className={
                    tone === 'deck'
                      ? 'text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]'
                      : tone === 'operator'
                        ? 'text-[10px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]'
                        : 'text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]'
                  }
                >
                  {card.meta}
                </div>
              ) : null}
            </button>
            {card.extra ? <div className={tone === 'deck' || tone === 'operator' ? 'pl-3 pt-2.5' : 'pl-1 pt-2.5'}>{card.extra}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
