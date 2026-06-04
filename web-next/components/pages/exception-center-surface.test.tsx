import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { ExceptionCenterSurface } from './exception-center-surface';

const t = createTranslatorMock({ locale: 'zh-CN' });

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t
  })
}));

describe('ExceptionCenterSurface', () => {
  it('renders a HertzBeat-native localized exception explorer without English shell copy', () => {
    const html = renderToStaticMarkup(<ExceptionCenterSurface type="500" />);

    expect(html).toContain('data-exception-center-surface="hertzbeat-ui-exceptions"');
    expect(html).toContain('data-exception-type="500"');
    expect(html).toContain('data-exception-shared-frame="hertzbeat-ui"');
    expect(html).toContain('data-hz-ui="explorer-frame"');
    expect(html).toContain('data-exception-filter-sidebar="hertzbeat-ui-exception-filters"');
    expect(html).toContain('data-exception-query-bar="hertzbeat-ui-error-query"');
    expect(html).toContain('data-exception-query-bar-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-exception-query-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-exception-scope-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-exception-sort-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-exception-table="hertzbeat-ui-exception-list"');
    expect(html).toContain('data-exception-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-exception-recovery-action-owner="hertzbeat-ui-button-link"');
    expect(html).toContain(t('exception.chrome.title'));
    expect(html).toContain(t('exception.chrome.filter-title'));
    expect(html).toContain(`aria-label="${t('exception.chrome.refresh-filters')}"`);
    expect(html).toContain(t('exception.filters.deployment-environment'));
    expect(html).toContain(t('exception.filters.service'));
    expect(html).toContain(t('exception.time.last-7d'));
    expect(html).toContain(t('exception.action.run-query'));
    expect(html).toContain(t('exception.table.type'));
    expect(html).toContain(t('exception.table.message'));
    expect(html).toContain(t('exception.table.count'));
    expect(html).toContain(t('exception.table.last-seen'));
    expect(html).toContain(t('exception.table.application'));
    expect(html).toContain('ECONNRESET');
    expect(html).toContain('href="/exception/500?error=econnreset-browser-frontend"');
    expect(html).toContain('href="/exception/500?error=payment-402-checkout"');
    expect(html).toContain('payment service returned 402');
    expect(html).toContain('browser-frontend');
    expect(html).not.toContain('Exceptions');
    expect(html).not.toContain('Filters');
    expect(html).not.toContain('Deployment Environment');
    expect(html).not.toContain('Service Name');
    expect(html).not.toContain('Last 7 days');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Exception Type');
    expect(html).not.toContain('Error Message');
    expect(html).not.toContain('Last Seen');
    expect(html).not.toContain('Application');
    expect(html).not.toContain('Search and Filter based on resource attributes');
  });

  it('keeps exception handoffs without reverting to the old Workbench page shell', () => {
    const html = renderToStaticMarkup(<ExceptionCenterSurface type="500" />);

    expect(html).toContain('href="/overview"');
    expect(html).toContain('href="/log/manage"');
    expect(html).toContain('href="/trace/manage"');
    expect(html).toContain(t('menu.dashboard.back'));
    expect(html).toContain(t('menu.log.manage'));
    expect(html).toContain(t('menu.trace.manage'));
  });

  it('does not keep old workbench/card owners inside the HertzBeat exception explorer', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/exception-center-surface.tsx'), 'utf8');

    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzExplorerFrame');
    expect(source).toContain('HzPanelSurface');
    expect(source).toContain('HzInput');
    expect(source).toContain('HzSelect');
    expect(source).toContain('HzButton');
    expect(source).toContain('HzDataTable');
    expect(source).toContain('HzButtonLink');
    expect(source).not.toContain("from '../ui/input'");
    expect(source).not.toContain("from '../ui/select'");
    expect(source).not.toContain('<table');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain("from '../workbench/primitives'");
    expect(source).toContain('data-exception-center-surface="hertzbeat-ui-exceptions"');
    expect(source).toContain("aria-label={t('exception.chrome.refresh-filters')}");
    expect(source).not.toContain('signoz');
  });
});
