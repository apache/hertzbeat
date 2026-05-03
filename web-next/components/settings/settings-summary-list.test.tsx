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
            title: '邮件服务器',
            lines: ['邮箱服务器地址: -', '邮箱账号: -'],
            actionLabel: '配置',
            onAction: vi.fn()
          },
          {
            key: 'sms',
            title: '短信配置',
            lines: ['短信类型: 腾讯短信', '启用状态: 否'],
            actionLabel: '配置',
            onAction: vi.fn()
          }
        ]}
      />
    );

    expect(html).toContain('data-settings-summary-list="true"');
    expect(html).toContain('data-settings-summary-list-owner="cold-settings-summary-owner"');
    expect(html).toContain('data-settings-summary-list-style="cold-dense-summary-list"');
    expect(html).toContain('data-settings-summary-item="email"');
    expect(html).toContain('data-settings-summary-item="sms"');
    expect(html).toContain('data-settings-summary-row-style="cold-summary-row"');
    expect(html).toContain('data-settings-summary-action="email"');
    expect(html).toContain('data-settings-summary-action="sms"');
    expect(html).toContain('data-settings-summary-action-style="cold-compact-action"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#0b0c0e]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('h-8');
    expect(html).toContain('邮件服务器');
    expect(html).toContain('短信配置');
    expect(html).toContain('配置');
    expect(html).not.toContain('angular-nz-list');
    expect(html).not.toContain('border-[#d8dee9]');
  });
});
