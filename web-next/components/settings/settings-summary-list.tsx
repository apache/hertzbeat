'use client';

import * as React from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type SettingsSummaryItem = {
  key: string;
  title: React.ReactNode;
  lines: React.ReactNode[];
  actionLabel: string;
  actionAriaLabel?: string;
  actionHelp?: {
    label: string;
    body: React.ReactNode;
    impact?: React.ReactNode;
  };
  actionButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
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
      data-settings-summary-list-owner="hertzbeat-ui-settings-summary-owner"
      data-settings-summary-list-style="hertzbeat-ui-dense-summary-list"
      className={cn(
        'overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]',
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.key}
          data-settings-summary-item={item.key}
          data-settings-summary-row-style="hertzbeat-ui-summary-row"
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
          <div className="flex shrink-0 items-center gap-1 md:pt-0.5">
            <Button
              type="button"
              data-settings-summary-action={item.key}
              data-settings-summary-action-style="hertzbeat-ui-compact-action"
              variant="default"
              aria-label={item.actionAriaLabel}
              className="h-8 min-w-[72px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151923] hover:text-[#f8fafc]"
              {...item.actionButtonProps}
              onClick={item.onAction}
            >
              {item.actionLabel}
            </Button>
            {item.actionHelp ? (
              <span data-settings-summary-action-help={item.key} className="group/help relative inline-flex h-4 w-4 items-center justify-center">
                <button
                  type="button"
                  aria-label={item.actionHelp.label}
                  data-settings-summary-action-help-trigger="hertzbeat-ui-action-help"
                  data-settings-summary-action-help-style="icon-after-action"
                  data-settings-summary-action-help-visual="circle-help-icon"
                  className="inline-flex h-4 w-4 items-center justify-center border-0 bg-transparent text-[#8da2ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
                <span
                  role="tooltip"
                  data-settings-summary-action-help-tooltip={item.key}
                  className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[300px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
                >
                  <span className="block text-[11px] leading-4 text-[#dbe4f0]">{item.actionHelp.body}</span>
                  {item.actionHelp.impact ? (
                    <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">
                      {item.actionHelp.impact}
                    </span>
                  ) : null}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
