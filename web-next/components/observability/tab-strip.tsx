'use client';

import React from 'react';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';

export type ObservabilityTabStripItem<T extends string> = {
  key: T;
  label: React.ReactNode;
};

const DEFAULT_OBSERVABILITY_TAB_STRIP_ARIA_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['common.tab-navigation'] ?? 'common.tab-navigation';

export function ObservabilityTabStrip<T extends string>({
  items,
  selectedKey,
  onSelect,
  ariaLabel = DEFAULT_OBSERVABILITY_TAB_STRIP_ARIA_LABEL,
  panelIdPrefix = 'observability',
  tone = 'default',
  variant = 'line',
  extra
}: {
  items: Array<ObservabilityTabStripItem<T>>;
  selectedKey: T;
  onSelect: (key: T) => void;
  ariaLabel?: string;
  panelIdPrefix?: string;
  tone?: 'default' | 'deck' | 'operator';
  variant?: 'line' | 'card';
  extra?: React.ReactNode;
}) {
  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();

    if (event.key === 'Home') {
      onSelect(items[0].key);
      return;
    }

    if (event.key === 'End') {
      onSelect(items[items.length - 1].key);
      return;
    }

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    onSelect(items[nextIndex].key);
  }

  if (tone === 'deck' || tone === 'operator') {
    if (variant === 'card') {
      const tabList = (
        <div
          className="flex flex-wrap items-end gap-1"
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          data-observability-tabstrip-card-list="true"
        >
          {items.map((item, index) => {
            const selected = selectedKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                id={`${panelIdPrefix}-tab-${item.key}`}
                data-tab={item.key}
                data-selected-tab={selected ? item.key : undefined}
                data-observability-tab-card="true"
                data-observability-tab-card-selected={selected ? 'true' : undefined}
                role="tab"
                aria-selected={selected}
                aria-controls={`${panelIdPrefix}-panel-${item.key}`}
                tabIndex={selected ? 0 : -1}
                className={`relative -mb-px inline-flex h-8 max-w-full items-center rounded-t-[3px] rounded-b-none border px-3 text-[12px] font-medium tracking-[0.02em] transition ${
                  selected
                    ? 'border-[var(--ops-border-color)] border-b-[var(--ops-surface-panel)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text-primary)]'
                }`}
                onKeyDown={event => handleTabKeyDown(event, index)}
                onClick={() => onSelect(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      );

      return (
        <div
          className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--ops-border-color)]"
          data-observability-tabstrip-extra={extra ? 'true' : undefined}
          data-observability-tabstrip-variant="card"
          data-observability-tabstrip-card="angular-nz-card"
        >
          {tabList}
          {extra ? (
            <div className="pb-2" data-observability-tabstrip-extra-slot="true">
              {extra}
            </div>
          ) : null}
        </div>
      );
    }

    const tabList = (
      <div
        className={[
          tone === 'operator' ? 'flex flex-wrap items-end gap-4' : 'flex flex-wrap items-end gap-3',
          extra ? '' : 'border-b border-[var(--ops-border-color)]'
        ].join(' ')}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        data-observability-tabstrip-variant="line"
      >
        {items.map((item, index) => (
          <div key={item.key} className="relative -mb-px">
            <button
              type="button"
              id={`${panelIdPrefix}-tab-${item.key}`}
              data-tab={item.key}
              data-selected-tab={selectedKey === item.key ? item.key : undefined}
              role="tab"
              aria-selected={selectedKey === item.key}
              aria-controls={`${panelIdPrefix}-panel-${item.key}`}
              tabIndex={selectedKey === item.key ? 0 : -1}
              className={`px-0 pb-2.5 pr-4 transition ${
                tone === 'operator'
                  ? selectedKey === item.key
                    ? 'text-[13px] font-semibold tracking-[0.02em] text-[var(--ops-text-primary)]'
                    : 'text-[13px] font-medium tracking-[0.02em] text-[var(--ops-text-secondary)] hover:text-[var(--ops-text-primary)]'
                  : selectedKey === item.key
                    ? 'text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-primary)]'
                    : 'text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-secondary)] hover:text-[var(--ops-text-primary)]'
              }`}
              onKeyDown={event => handleTabKeyDown(event, index)}
              onClick={() => onSelect(item.key)}
            >
              {item.label}
            </button>
            <div
              data-observability-tab-indicator="underline"
              className={`h-[2px] w-full transition ${
                selectedKey === item.key
                  ? tone === 'operator'
                    ? 'bg-[var(--ops-primary)]'
                    : 'bg-[var(--ops-primary)]'
                  : 'bg-transparent'
              }`}
            />
          </div>
        ))}
      </div>
    );

    if (extra) {
      return (
        <div
          className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--ops-border-color)]"
          data-observability-tabstrip-extra="true"
        >
          {tabList}
          <div className="pb-2" data-observability-tabstrip-extra-slot="true">
            {extra}
          </div>
        </div>
      );
    }

    return tabList;
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--ops-border-color)] pb-3">
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          data-tab={item.key}
          data-selected-tab={selectedKey === item.key ? item.key : undefined}
          className={`rounded-[4px] border px-3 py-2 text-sm font-medium transition ${
            selectedKey === item.key
              ? 'border-[var(--ops-primary)] bg-[var(--ops-surface-raised)] text-[var(--ops-text-primary)]'
              : 'border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-primary)] hover:text-[var(--ops-text-primary)]'
          }`}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
