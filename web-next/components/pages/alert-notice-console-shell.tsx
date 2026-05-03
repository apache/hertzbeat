'use client';

import React from 'react';
import { AlertSurfacePanel } from './alert-surface-primitives';
import { cn } from '../../lib/utils';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertNoticeConsoleTabKey = 'receiver' | 'rule' | 'template';

type AlertNoticeConsoleShellProps = {
  t: Translator;
  selectedTab: AlertNoticeConsoleTabKey;
  onSelectTab: (tab: AlertNoticeConsoleTabKey) => void;
  receiverContent: React.ReactNode;
  ruleContent: React.ReactNode;
  templateContent: React.ReactNode;
};

export function AlertNoticeConsoleShell({
  t,
  selectedTab,
  onSelectTab,
  receiverContent,
  ruleContent,
  templateContent
}: AlertNoticeConsoleShellProps) {
  const tabs = [
    { key: 'receiver' as const, label: t('alert.notice.receiver') },
    { key: 'rule' as const, label: t('alert.notice.rule') },
    { key: 'template' as const, label: t('alert.notice.template') }
  ];

  const panelContent =
    selectedTab === 'receiver' ? receiverContent : selectedTab === 'rule' ? ruleContent : templateContent;

  return (
    <div data-alert-notice-console="true">
      <AlertSurfacePanel
        data-alert-notice-workbench-panel="cold-tabbed-table-panel"
        data-alert-notice-global-panel="cold-matte-tabbed-table"
        className="min-h-[680px] overflow-hidden rounded-[4px] border-[#252b34] bg-[#0b0c0e] p-0"
      >
        <div
          data-alert-notice-tabs="cold-segmented-tabs"
          className="flex flex-wrap items-center gap-1 border-b border-[#252b34] bg-[#0b0c0e] px-3 py-2"
          role="tablist"
          aria-orientation="horizontal"
        >
          {tabs.map(tab => {
            const selected = tab.key === selectedTab;
            return (
              <button
                key={tab.key}
                type="button"
                id={`alert-notice-console-tab-${tab.key}`}
                data-tab={tab.key}
                data-selected-tab={selected ? tab.key : undefined}
                role="tab"
                aria-selected={selected}
                aria-controls={`alert-notice-console-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelectTab(tab.key)}
                className={cn(
                  'h-8 min-w-[108px] rounded-[3px] border px-3 text-[12px] font-semibold transition',
                  selected
                    ? 'border-[#4e74f8] bg-[#151b28] text-[#eef4ff]'
                    : 'border-[#252b34] bg-[#101217] text-[#8f99ab] hover:border-[#394252] hover:text-[#f2f5f8]'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div
          data-alert-notice-console-panel="true"
          data-panel-tab={selectedTab}
          id={`alert-notice-console-panel-${selectedTab}`}
          role="tabpanel"
          aria-labelledby={`alert-notice-console-tab-${selectedTab}`}
        >
          {panelContent}
        </div>
      </AlertSurfacePanel>
    </div>
  );
}
