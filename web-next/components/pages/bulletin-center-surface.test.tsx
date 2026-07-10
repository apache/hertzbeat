import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { BulletinCenterSurface } from './bulletin-center-surface';

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
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
  WorkspaceTabStrip: ({ tabs, ariaLabel }: any) => (
    <div data-bulletin-tabs="true" aria-label={ariaLabel}>
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
    <label data-hz-checkbox-owner="hertzbeat-ui-checkbox">
      <input type="checkbox" data-hz-checkbox-control="native-hidden" {...props} />
      <span data-hz-checkbox-box="indicator" />
      <span data-hz-checkbox-label="true">{label}</span>
    </label>
  )
}));

describe('bulletin center surface', () => {
  it('renders the shared HertzBeat toolbar, tabs, and metrics desk shell', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
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
    expect(html).toContain(`aria-label="${t('bulletin.navigation.aria')}"`);
    expect(html).toContain('data-bulletin-metrics-table="true"');
    expect(html).toContain('Ops board');
    expect(html).toContain('DB board');
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('common.button.new'));
  });

  it('uses a specific edit label in the row menu instead of the generic operation label', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');

    expect(source).toContain("t('common.button.edit')");
    expect(source).not.toContain("t('common.edit')");
  });

  it('routes current bulletin deletion through the shared HertzBeat modal instead of native confirm', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');

    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).toContain('data-bulletin-delete-confirm-trigger="hertzbeat-ui-modal"');
    expect(source).toContain('data-bulletin-delete-confirm="hertzbeat-ui-modal"');
    expect(source).toContain("ariaLabel={t('bulletin.navigation.aria')}");
    expect(source).not.toContain('ariaLabel="Bulletin navigation"');
    expect(source).toContain("t('bulletin.delete.title')");
    expect(source).toContain("t('bulletin.delete.copy')");
    expect(source).toContain("t('bulletin.delete.confirm')");
    expect(source).toContain("t('common.cancel')");
    expect(source).toContain("closeLabel={t('common.dialog.close')}");
    expect(source).not.toContain(t('bulletin.delete.title'));
    expect(source).not.toContain(t('bulletin.delete.copy'));
  });

  it('trims blank current bulletin names to the localized empty fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');

    expect(source).toContain("const currentBulletinName = (activeBulletin?.name || '').trim() || t('common.none');");
    expect(source).toContain('{currentBulletinName}');
    expect(source).not.toContain("const currentBulletinName = activeBulletin?.name || t('common.none');");
    expect(source).not.toContain("activeBulletin?.name || '-'");
  });

  it('uses the shared HertzBeat UI checkbox for batch delete selection instead of raw checkbox chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');

    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('data-bulletin-batch-delete-checkbox={String(item.id)}');
    expect(source).toContain('<Checkbox');
    expect(source).not.toContain('<input\n                  type="checkbox"');
  });
});
