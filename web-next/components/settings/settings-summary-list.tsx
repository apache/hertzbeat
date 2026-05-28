'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type SettingsSummaryItem = {
  key: string;
  title: React.ReactNode;
  lines: React.ReactNode[];
  actionLabel: string;
  actionAriaLabel?: string;
  onAction: () => void;
};

export function SettingsSummaryList({
  items,
  className
}: {
  items: SettingsSummaryItem[];
  className?: string;
}) {
  return (
    <div
      data-settings-summary-list="true"
      data-settings-summary-list-owner="cold-settings-summary-owner"
      data-settings-summary-list-style="cold-dense-summary-list"
      className={cn(
        'overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]',
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.key}
          data-settings-summary-item={item.key}
          data-settings-summary-row-style="cold-summary-row"
          className={cn(
            'flex min-h-24 flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between',
            index < items.length - 1 ? 'border-b border-[#2b3039]' : ''
          )}
        >
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-5 text-[#f5f7fb]">{item.title}</div>
            <div className="mt-2 grid gap-1 text-[12px] leading-5 text-[#929aa7]">
              {item.lines.map((line, lineIndex) => (
                <div key={`${item.key}-${lineIndex}`}>{line}</div>
              ))}
            </div>
          </div>
          <div className="shrink-0 md:pt-0.5">
            <Button
              type="button"
              data-settings-summary-action={item.key}
              data-settings-summary-action-style="cold-compact-action"
              variant="default"
              aria-label={item.actionAriaLabel}
              className="h-8 min-w-[72px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151923] hover:text-[#f8fafc]"
              onClick={item.onAction}
            >
              {item.actionLabel}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
