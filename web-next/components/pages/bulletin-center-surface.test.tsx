import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('../workbench/action-toolbar', () => ({
  ActionToolbar: ({ left, right, className }: any) => (
    <div data-action-toolbar="true" className={className}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}));

vi.mock('../workbench/workspace-tab-strip', () => ({
  WorkspaceTabStrip: ({ tabs }: any) => (
    <div data-bulletin-tabs="true">
      {tabs.map((tab: any) => (
        <button key={tab.key} type="button">
          {tab.label}
        </button>
      ))}
    </div>
  )
}));

vi.mock('./bulletin-metrics-table', () => ({
  BulletinMetricsTable: () => <div data-bulletin-metrics-table="true">metrics table</div>
}));

vi.mock('./bulletin-manage-dialog', () => ({
  BulletinManageDialog: () => <div data-bulletin-manage-dialog="true">manage dialog</div>
}));

vi.mock('../workbench/overlay-dialog', () => ({
  OverlayDialog: ({ open, children }: any) => (open ? <div data-overlay-dialog="true">{children}</div> : null)
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/checkbox', () => ({
  Checkbox: ({ label, ...props }: any) => (
    <label data-cold-checkbox-owner="cold-checkbox">
      <input type="checkbox" data-cold-checkbox-control="native-hidden" {...props} />
      <span data-cold-checkbox-box="indicator" />
      <span data-cold-checkbox-label="true">{label}</span>
    </label>
  )
}));

describe('bulletin center surface', () => {
  it('renders the shared HertzBeat toolbar, tabs, and metrics desk shell', async () => {
    const { BulletinCenterSurface } = await import('./bulletin-center-surface');
    const html = renderToStaticMarkup(
      <BulletinCenterSurface
        data={{
          list: {
            totalElements: 2,
            content: [
              { id: 7, name: 'Ops board', app: 'website', monitorIds: [1, 2], creator: 'ops' },
              { id: 8, name: 'DB board', app: 'website', monitorIds: [3], creator: 'ops' }
            ]
          }
        }}
        refreshTick={0}
        onReload={() => {}}
      />
    );

    expect(html).toContain('data-bulletin-center-surface="true"');
    expect(html).toContain('data-action-toolbar="true"');
    expect(html).toContain('data-bulletin-tabs="true"');
    expect(html).toContain('data-bulletin-metrics-table="true"');
    expect(html).toContain('Ops board');
    expect(html).toContain('DB board');
    expect(html).toContain('Refresh');
    expect(html).toContain('New');
  });

  it('routes current bulletin deletion through a cold modal instead of native confirm', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');

    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).toContain('data-bulletin-delete-confirm-trigger="cold-modal"');
    expect(source).toContain('data-bulletin-delete-confirm="cold-modal"');
    expect(source).toContain('确认删除公告');
    expect(source).toContain('确认删除');
    expect(source).toContain('取消');
  });

  it('uses the shared cold checkbox for batch delete selection instead of raw checkbox chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');

    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('data-bulletin-batch-delete-checkbox={String(item.id)}');
    expect(source).toContain('<Checkbox');
    expect(source).not.toContain('<input\n                  type="checkbox"');
  });
});
