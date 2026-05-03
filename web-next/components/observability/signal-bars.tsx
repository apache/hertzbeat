'use client';

import React from 'react';

export type ObservabilitySignalBarItem = {
  label: string;
  value: string;
  widthPercent: number;
};

export function ObservabilitySignalBars({
  items
}: {
  items: ObservabilitySignalBarItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--ops-text-secondary)]">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--ops-surface-raised)]">
            <div
              className="h-full rounded-full bg-[var(--ops-primary)]"
              style={{ width: `${Math.max(8, Math.min(100, Math.round(item.widthPercent)))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
