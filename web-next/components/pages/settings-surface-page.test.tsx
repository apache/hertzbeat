import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t
  })
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => (
    <div data-row-list="true">
      {rows.map((row: any) => (
        <article key={row.key ?? row.title}>
          <h3>{row.title}</h3>
          <p>{row.copy}</p>
          <small>{row.meta}</small>
        </article>
      ))}
    </div>
  )
}));

vi.mock('@/components/workbench/primitives', () => ({
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  )
}));

describe('SettingsSurfacePage', () => {
  it('renders platform governance groups without fake future navigation entries', async () => {
    const { SettingsSurfacePage } = await import('./settings-surface-page');
    const pageTitle = 'System settings';
    const pageSubtitle = 'Configure platform governance entry points.';
    const nextStep = 'Organize platform governance';

    const html = renderToStaticMarkup(
      <SettingsSurfacePage title={pageTitle} subtitle={pageSubtitle} nextStep={nextStep} />
    );

    expect(html).toContain(pageTitle);
    expect(html).toContain(pageSubtitle);
    expect(html).toContain('data-settings-surface-page-frame="hertzbeat-ui-unframed-workspace"');
    expect(html).toContain('data-settings-surface-page-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-settings-surface-page-visual-contract="flat-settings-entry"');
    expect(html).toContain('data-settings-surface-page-facts="hertzbeat-ui-inline-facts"');
    expect(html).toContain(t('settings.surface.governance.title'));
    expect(html).toContain(t('settings.surface.title'));
    expect(html).toContain(t('settings.surface.copy'));
    expect(html).toContain(t('settings.surface.route-contract.meta'));
    expect(html).toContain(t('settings.surface.api-contract.meta'));
    expect(html).toContain(t('settings.surface.governance.copy'));
    expect(html).toContain(t('settings.surface.governance.group.api-access'));
    expect(html).toContain('/setting/settings/token');
    expect(html).toContain(t('settings.surface.governance.group.notifications'));
    expect(html).toContain('/alert/notice');
    expect(html).toContain(t('settings.surface.governance.group.template-marketplace'));
    expect(html).toContain('/setting/define · /setting/plugins');
    expect(html).toContain(t('settings.surface.governance.future.title'));
    expect(html).toContain(t('settings.surface.governance.future.meta'));
    expect(html).toContain(t('settings.surface.governance.future.security'));
    expect(html).toContain('/docs/roadmap/future-security');
    expect(html).not.toContain('href="/security"');
    expect(html).not.toContain('data-workbench-page="true"');
  });

  it('keeps the settings entry off the legacy WorkbenchPage wrapper', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/settings-surface-page.tsx'), 'utf8');

    expect(source).toContain('data-settings-surface-page-frame="hertzbeat-ui-unframed-workspace"');
    expect(source).toContain('data-settings-surface-page-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-settings-surface-page-visual-contract="flat-settings-entry"');
    expect(source).not.toContain('WorkbenchPage');
  });
});
