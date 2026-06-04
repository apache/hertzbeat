import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SettingsSummaryList } from './settings-summary-list';

describe('SettingsSummaryList', () => {
  it('renders cold dense summary rows with compact right-side actions', () => {
    const html = renderToStaticMarkup(
      <SettingsSummaryList
        items={[
          {
            key: 'email',
            title: 'Email server',
            lines: ['Email server address: -', 'Email account: -'],
            actionLabel: 'Configure',
            actionAriaLabel: 'Configure email server',
            onAction: vi.fn()
          },
          {
            key: 'sms',
            title: 'SMS settings',
            lines: ['SMS type: Tencent SMS', 'Enabled: no'],
            actionLabel: 'Configure',
            actionAriaLabel: 'Configure SMS settings',
            onAction: vi.fn()
          }
        ]}
      />
    );

    expect(html).toContain('data-settings-summary-list="true"');
    expect(html).toContain('data-settings-summary-list-owner="hertzbeat-ui-settings-summary-owner"');
    expect(html).toContain('data-settings-summary-list-style="hertzbeat-ui-dense-summary-list"');
    expect(html).toContain('data-settings-summary-item="email"');
    expect(html).toContain('data-settings-summary-item="sms"');
    expect(html).toContain('data-settings-summary-row-style="hertzbeat-ui-summary-row"');
    expect(html).toContain('data-settings-summary-action="email"');
    expect(html).toContain('data-settings-summary-action="sms"');
    expect(html).toContain('data-settings-summary-action-style="hertzbeat-ui-compact-action"');
    expect(html).toContain('aria-label="Configure email server"');
    expect(html).toContain('aria-label="Configure SMS settings"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#0b0c0e]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('h-8');
    expect(html).toContain('Email server');
    expect(html).toContain('SMS settings');
    expect(html).toContain('Configure');
    expect(html).not.toContain('angular-nz-list');
    expect(html).not.toContain('border-[#d8dee9]');
  });
});
