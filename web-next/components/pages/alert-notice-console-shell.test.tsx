import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AlertNoticeConsoleShell } from './alert-notice-console-shell';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('AlertNoticeConsoleShell', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });

  it('renders the HertzBeat top-level notice tabs and only the selected panel content', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeConsoleShell
        t={t}
        selectedTab="rule"
        onSelectTab={() => {}}
        receiverContent={<div>receiver-panel</div>}
        ruleContent={<div>rule-panel</div>}
        templateContent={<div>template-panel</div>}
      />
    );

    expect(html).toContain('data-alert-notice-console="true"');
    expect(html).toContain('data-alert-notice-workbench-panel="cold-tabbed-table-panel"');
    expect(html).toContain('data-alert-notice-global-panel="cold-matte-tabbed-table"');
    expect(html).toContain('data-alert-notice-tabs="hertzbeat-ui-segmented-tabs"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('data-tab="receiver"');
    expect(html).toContain('data-tab="rule"');
    expect(html).toContain('data-tab="template"');
    expect(html).toContain('data-selected-tab="rule"');
    expect(html).toContain(t('alert.notice.receiver'));
    expect(html).toContain(t('alert.notice.rule'));
    expect(html).toContain(t('alert.notice.template'));
    expect(html).toContain('data-alert-notice-console-panel="true"');
    expect(html).toContain('data-panel-tab="rule"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('rule-panel');
    expect(html).not.toContain('receiver-panel');
    expect(html).not.toContain('template-panel');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-console-shell.tsx'), 'utf8');
    expect(source).not.toContain('ObservabilityTabStrip');
    expect(source).not.toContain('bg-[#14213a]');
  });
});
