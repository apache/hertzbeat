import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorDetailConsole } from './monitor-detail-console';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/font/google', () => ({
  IBM_Plex_Sans: () => ({ className: 'font-ibm-plex-sans' }),
  IBM_Plex_Mono: () => ({ className: 'font-ibm-plex-mono' }),
}));

const t = createTranslatorMock();

describe('monitor detail console', () => {
  it('uses zh-CN breadcrumb copy for the reported reference route', () => {
    const zh = createTranslatorMock({ locale: 'zh-CN' });
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'website',
          status: 1,
          instance: 'example.com:443'
        } as any}
        workbenchSummaryFacts={[
          { key: 'realtime', label: zh('monitor.detail.workbench.summary.realtime'), value: '2' },
          { key: 'history', label: zh('monitor.detail.workbench.summary.history'), value: '0' },
          { key: 'favorite', label: zh('monitor.detail.workbench.summary.favorite'), value: '0' }
        ]}
        currentTab="realtime"
        refreshInterval={30}
        refreshCountdown={18}
        backHref="/monitors"
        editHref="/monitors/42/edit"
        appHref="/setting/define?app=website"
        navigationContext={{ app: 'website' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        t={zh}
      />
    );

    expect(html).toContain(zh('monitor.list'));
    expect(html).toContain(zh('monitor.detail'));
    expect(html).toContain(zh('monitor.detail.realtime'));
    expect(html).toContain('<h1 class="sr-only" data-monitor-detail-screenreader-heading="monitor-name">checkout-core</h1>');
    expect(html).toContain('data-monitor-detail-header-mode="breadcrumb-only"');
    expect(html).toContain('data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"');
    expect(html).toContain('data-monitor-detail-context-mark="breadcrumb"');
    expect(html).toContain('data-monitor-detail-context-mark-owner="hertzbeat-ui-inline-context-mark"');
    expect(html).not.toContain('data-monitor-detail-app-chip="breadcrumb"');
    expect(html).not.toMatch(/\u76d1\u63a7\u5de5\u4f5c\u53f0/);
    expect(html).not.toContain('Monitors');
    expect(html).not.toContain('Monitor detail');
  });

  it('renders monitor navigation with investigation tabs and refresh controls', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'http',
          status: 1,
          instance: '10.0.0.1'
        } as any}
        workbenchSummaryFacts={[
          { key: 'realtime', label: 'Real-time Metrics', value: '2' },
          { key: 'history', label: 'Historical Charts', value: '0' },
          { key: 'favorite', label: 'Favorites', value: '1' }
        ]}
        currentTab="grafana"
        refreshInterval={30}
        refreshCountdown={18}
        backHref="/monitors?app=http"
        editHref="/monitors/42/edit?app=http"
        helpHref="https://hertzbeat.apache.org/docs/help/http"
        entityDraftHref="/entities/new?source=telemetry&monitorId=42"
        appHref="/setting/define?app=http"
        grafanaUrl="https://grafana.example/d/monitor"
        navigationContext={{ app: 'http' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        grafanaContent={<div>grafana stage</div>}
        t={t}
      />
    );

    expect(html).toContain('Overview');
    expect(html).toContain('Monitors');
    expect(html).toContain('Monitor detail');
    expect(html).not.toContain('Monitor Workbench');
    expect(html).toContain('<h1 class="sr-only" data-monitor-detail-screenreader-heading="monitor-name">checkout-core</h1>');
    expect(html).not.toContain('Review real-time metrics, historical trends, and favorites around monitor instance 10.0.0.1 with the same observation workbench language.');
    expect(html).toContain('Monitor Real-Time Detail');
    expect(html).toContain('Monitor Historical Chart Detail');
    expect(html).toContain('Favorites');
    expect(html).toContain('Grafana');
    expect(html).not.toContain('Real-time Metrics');
    expect(html).not.toContain('Historical Charts');
    expect(html).not.toContain('data-monitor-workbench-summary-facts="angular-workbench"');
    expect(html).not.toContain('data-monitor-workbench-summary-rhythm="angular-chip-row"');
    expect(html).not.toContain('data-monitor-workbench-summary-density="angular-pill-toolbar"');
    expect(html).not.toContain('data-monitor-workbench-summary-item="realtime"');
    expect(html).not.toContain('data-monitor-workbench-summary-item="history"');
    expect(html).not.toContain('data-monitor-workbench-summary-item="favorite"');
    expect(html).toContain('data-monitor-detail-tab-label-source="angular-title"');
    expect(html).toContain('data-monitor-detail-tab-label="realtime"');
    expect(html).toContain('data-monitor-detail-tab-label="history"');
    expect(html).toContain('data-monitor-detail-tab-label="favorites"');
    expect(html).toContain('data-monitor-detail-tab-icon="realtime"');
    expect(html).toContain('data-monitor-detail-tab-icon="history"');
    expect(html).toContain('data-monitor-detail-tab-icon="favorites"');
    expect(html).toContain('data-hz-ui="monitor-detail-tab-label"');
    expect(html).toContain('data-monitor-detail-tab-label-owner="hertzbeat-ui-detail-tab-label"');
    expect(html).toContain('data-monitor-detail-tab-icon-owner="hertzbeat-ui-detail-tab-label"');
    expect(html).not.toContain('Monitor ID');
    expect(html).not.toContain('Status</div>');
    expect(html).not.toContain('Updated</div>');
    expect(html).toContain('Set Auto Refresh For 10 s');
    expect(html).toContain('Set Auto Refresh For 30 s');
    expect(html).toContain('Set Auto Refresh For 300 s');
    expect(html).toContain('Close Auto Refresh');
    expect(html).toContain('data-monitor-refresh-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-monitor-refresh-select="true"');
    expect(html).toContain('data-hz-ui="select"');
    expect(html).toContain('data-hz-ui="select-menu"');
    expect(html).toContain('data-monitor-detail-refresh-options-contract="angular-config-refresh-copy"');
    expect(html).toContain('data-monitor-detail-refresh-copy-contract="angular-deadline-label"');
    expect(html).toContain('data-monitor-detail-countdown-reset-contract="angular-deadline-reset"');
    expect(html).not.toContain('<select');
    expect(html).toContain('Refresh');
    expect(html).toContain('Auto Refresh After 18 s');
    expect(html).not.toContain('Back to monitors');
    expect(html).not.toContain('Edit monitor');
    expect(html).toContain('Help');
    expect(html).toContain('data-monitor-detail-tab-extra-contract="angular-refresh-help"');
    expect(html).toContain('data-monitor-detail-tab-extra-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-monitor-refresh-command-action="refresh"');
    expect(html).toContain('data-monitor-detail-command-action="open-help"');
    expect(html).toContain('data-monitor-detail-help-action="angular-docs-help"');
    expect(html).toContain('data-monitor-detail-help-owner="hertzbeat-ui-icon-link"');
    expect(html).toContain('data-monitor-detail-help-target="https://hertzbeat.apache.org/docs/help/http"');
    expect(html).toContain('data-monitor-detail-command-action="create-entity-draft"');
    expect(html).toContain('data-monitor-detail-entity-draft-action="telemetry-monitor-seed"');
    expect(html).toContain('data-monitor-detail-entity-draft-owner="hertzbeat-ui-labeled-action-link"');
    expect(html).toContain('data-monitor-detail-entity-draft-visibility="visible-label"');
    expect(html).toContain('data-monitor-detail-entity-draft-target="/entities/new?source=telemetry&amp;monitorId=42"');
    expect(html).toContain('Create entity from this monitor');
    expect(html).toContain('data-monitor-detail-list-return="angular-app-filter"');
    expect(html).toContain('data-monitor-detail-list-return-target="/monitors?app=http"');
    expect(html).toContain('data-hz-ui="icon-link"');
    expect(html).not.toContain('Open Grafana');
    expect(html).toContain('grafana stage');
    expect(html).toContain('/setting/define?app=http');
    expect(html).toContain('https://hertzbeat.apache.org/docs/help/http');
    expect(html).toMatch(/data-monitor-console-layout=\"angular-workbench\"/);
    expect(html).toMatch(/data-monitor-console-tone=\"operator-sheet\"/);
    expect(html).toMatch(/data-hz-ui=\"monitor-detail-console-shell\"/);
    expect(html).toMatch(/data-monitor-detail-console-shell-owner=\"hertzbeat-ui-detail-console-shell\"/);
    expect(html).toMatch(/data-hz-ui=\"monitor-detail-workbench-frame\"/);
    expect(html).toMatch(/data-monitor-workbench-stage-owner=\"hertzbeat-ui-detail-workbench-frame\"/);
    expect(html).toMatch(/data-monitor-detail-completion-guard=\"reported-angular-no-card-stack\"/);
    expect(html).toMatch(/data-monitor-detail-body-stack-state=\"single-workbench-table-rows\"/);
    expect(html).toMatch(/data-monitor-detail-completion-header=\"breadcrumb-only\"/);
    expect(html).toMatch(/data-monitor-first-viewport-rhythm=\"angular-tight\"/);
    expect(html).toMatch(/data-monitor-detail-header-mode=\"breadcrumb-only\"/);
    expect(html).toMatch(/data-monitor-detail-reference-source=\"apache-hertzbeat-master-monitor-detail\"/);
    expect(html).toMatch(/data-monitor-detail-breadcrumb-owner=\"hertzbeat-ui-monitor-breadcrumb\"/);
    expect(html).toMatch(/data-hz-ui=\"monitor-breadcrumb\"/);
    expect(html).toMatch(/data-monitor-detail-context-mark=\"breadcrumb\"/);
    expect(html).toMatch(/data-monitor-detail-context-mark-owner=\"hertzbeat-ui-inline-context-mark\"/);
    expect(html).toMatch(/data-monitor-detail-app-definition-link=\"angular-monitor-app\"/);
    expect(html).toMatch(/data-monitor-detail-app-definition-target=\"\/setting\/define\?app=http\"/);
    expect(html).not.toMatch(/data-monitor-detail-app-chip=\"breadcrumb\"/);
    expect(html).toMatch(/data-hz-ui=\"monitor-detail-tab-panel\"/);
    expect(html).toMatch(/data-monitor-console-tab-panel=\"true\"/);
    expect(html).toMatch(/data-monitor-console-tab-panel-owner=\"hertzbeat-ui-detail-tab-panel\"/);
    expect(html).toMatch(/data-monitor-console-tab-panel-rhythm=\"shared-tight\"/);
    expect(html).not.toMatch(/data-monitor-detail-return-action=\"true\"/);
    expect(html).toMatch(/class=\"[^\"]*-mx-4[^\"]*space-y-2[^\"]*px-3[^\"]*pb-3[^\"]*pt-0[^\"]*sm:-mx-6[^\"]*sm:px-3/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-page-frame/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-breadcrumb/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-header/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-header__main/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-header__chips/);
    expect(html).not.toMatch(/class=\"[^\"]*app-page-shell-kicker/);
    expect(html).not.toMatch(/class=\"[^\"]*app-page-shell-subtitle/);
    expect(html).not.toMatch(/data-monitor-header-layout=\"angular-context-rail\"/);
    expect(html).not.toMatch(/data-monitor-header-proportion=\"angular-reference\"/);
    expect(html).not.toMatch(/data-monitor-header-context-rail=\"true\"/);
    expect(html).not.toMatch(/data-monitor-header-context-rail-density=\"angular-stacked\"/);
    expect(html).not.toMatch(/data-monitor-header-rail-align=\"title-block\"/);
    expect(html).not.toMatch(/data-monitor-header-kicker=\"angular-workbench\"/);
    expect(html).not.toMatch(/data-monitor-header-copy=\"angular-workbench\"/);
    expect(html).not.toMatch(/data-observability-context-chip-bar=\"true\"/);
    expect(html).not.toMatch(/data-observability-context-chip-variant=\"header\"/);
    expect(html).not.toMatch(/class=\"[^\"]*platform-context-chip-bar--dense/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-header__context-stack/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-strip/);
    expect(html).toMatch(/class=\"[^\"]*overflow-visible[^\"]*bg-transparent/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-layout/);
    expect(html).toMatch(/data-monitor-workbench-stage=\"angular-layout\"/);
    expect(html).toMatch(/data-monitor-workbench-stage-chrome=\"angular-tabset-direct\"/);
    expect(html).toMatch(/data-monitor-workbench-stage-rhythm=\"direct-tab-body\"/);
    expect(html).toMatch(/data-monitor-tab-body-surface=\"hertzbeat-ui-detail-tab-panel\"/);
    expect(html).not.toMatch(/data-monitor-workbench-stage-chrome=\"single-sheet\"/);
    expect(html).not.toMatch(/data-monitor-tab-body-surface=\"unified-stage\"/);
    expect(html).toMatch(/data-monitor-detail-tabset-type=\"bottom-underline-switch\"/);
    expect(html).toMatch(/data-hz-ui=\"monitor-detail-tabs\"/);
    expect(html).toMatch(/data-monitor-detail-tabs-owner=\"hertzbeat-ui-monitor-detail-tabs\"/);
    expect(html).toMatch(/data-monitor-detail-tabs-variant=\"bottom-underline-switch\"/);
    expect(html).toMatch(/data-monitor-detail-tabs-control-baseline=\"underline-28\"/);
    expect(html).toMatch(/data-monitor-detail-tabs-family=\"top-tab-underline\"/);
    expect(html).toMatch(/data-monitor-detail-tab-underline=\"true\"/);
    expect(html).toMatch(/data-monitor-detail-tab-underline-selected=\"true\"/);
    expect(html).toMatch(/data-monitor-detail-tab-control-baseline=\"underline-28\"/);
    expect(html).toMatch(/data-hz-control-edge=\"bottom-underline\"/);
    expect(html).toMatch(/data-monitor-detail-tab-visual-family=\"top-tab-underline\"/);
    expect(html).toMatch(/class=\"[^\"]*h-7[^\"]*after:absolute/);
    expect(html).not.toMatch(/class=\"[^\"]*min-h-10/);
    expect(html).not.toMatch(/sm:self-end/);
    expect(html).not.toMatch(/data-monitor-detail-tabs-variant=\"compact-toolbar-buttons\"/);
    expect(html).not.toMatch(/data-monitor-detail-tab-toolbar-button=\"true\"/);
    expect(html).not.toMatch(/data-monitor-detail-tab-accent-card=\"true\"/);
    expect(html).not.toMatch(/data-monitor-detail-tab-accent-card-selected=\"true\"/);
    expect(html).not.toMatch(/data-monitor-detail-tab-card=\"true\"/);
    expect(html).toMatch(/class=\"[^\"]*pb-2/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-detail-workbench-tabs/);
    expect(html).not.toMatch(/data-monitor-header-context-rail=\"true\"/);
    expect(html).not.toMatch(/<p[^>]*>10\.0\.0\.1<\/p>/);
    expect(html.indexOf('data-monitor-detail-header-mode=\"breadcrumb-only\"')).toBeLessThan(
      html.indexOf('data-monitor-workbench-stage=\"angular-layout\"')
    );
    expect(html).toMatch(/data-monitor-refresh-toolbar-variant=\"compact-toolbar-extra\"/);
    expect(html).toMatch(/data-monitor-refresh-toolbar-position=\"tabbar-extra\"/);
    expect(html).toMatch(/data-hz-ui=\"monitor-refresh-toolbar\"/);
    expect(html).toMatch(/data-hz-monitor-refresh-toolbar-layout=\"single-row-compact\"/);
    expect(html).toMatch(/data-monitor-refresh-toolbar-density=\"inline-quiet-controls\"/);
    expect(html).toMatch(/data-monitor-refresh-badge-variant=\"quiet\"/);
    expect(html).toMatch(/data-monitor-refresh-select-density=\"quiet\"/);
    expect(html).toMatch(/data-monitor-refresh-action-density=\"quiet\"/);
    expect(html).toMatch(/data-monitor-refresh-control-baseline=\"control-32-lined\"/);
    expect(html).not.toMatch(/data-monitor-signal-handoff=\"compact-actions\"/);
    expect(html).not.toMatch(/data-monitor-signal-handoff-link=\"metrics\"/);
    expect(html).not.toMatch(/data-monitor-signal-handoff-link=\"logs\"/);
    expect(html).not.toMatch(/data-monitor-signal-handoff-link=\"traces\"/);
    expect(html).toMatch(/data-hz-control-height=\"32\"/);
    expect(html).toMatch(/data-hz-control-height=\"28\"/);
    expect(html).toMatch(/data-hz-control-edge=\"lined\"/);
    expect(html).toMatch(/class=\"[^\"]*h-8[^\"]*border-\[var\(--hz-ui-line-soft\)\]/);
    expect(html).toMatch(/class=\"[^\"]*h-7[^\"]*border-\[var\(--hz-ui-line-soft\)\]/);
    expect(html).not.toMatch(/!border-transparent/);
    expect(html).not.toMatch(/data-monitor-refresh-toolbar-density=\"angular-bordered-controls\"/);
    expect(html).not.toMatch(/data-monitor-refresh-badge-variant=\"bordered\"/);
    expect(html).not.toMatch(/data-monitor-refresh-select-density=\"bordered\"/);
    expect(html).not.toMatch(/data-monitor-refresh-action-density=\"bordered\"/);
    expect(html).toMatch(/data-monitor-detail-tabs-extra=\"true\"/);
    expect(html).toMatch(/data-monitor-detail-tabs-extra-slot=\"true\"/);
    expect(html).not.toMatch(/data-observability-tab-indicator=\"underline\"/);
    expect(html).not.toMatch(/data-monitor-detail-tabs-variant=\"angular-card\"/);
    expect(html).not.toMatch(/data-observability-tabstrip-variant=\"card\"/);
    expect(html).not.toMatch(/data-observability-tabstrip-card=\"angular-nz-card\"/);
    expect(html.indexOf('role=\"tablist\"')).toBeLessThan(html.indexOf('data-monitor-refresh-toolbar-variant=\"compact-toolbar-extra\"'));
    expect(html).toMatch(/data-monitor-refresh-select=\"true\"/);
    expect(html).not.toMatch(/data-refresh-selected=\"30\"/);
    expect(html).toMatch(/data-selected-tab=\"grafana\"/);
    expect(html).toMatch(/role=\"tablist\"/);
    expect(html).toMatch(/role=\"tab\"/);
    expect(html).toMatch(/aria-controls=\"monitor-detail-panel-grafana\"/);
    expect(html).toMatch(/role=\"tabpanel\"/);
    expect(html).toMatch(/aria-labelledby=\"monitor-detail-tab-grafana\"/);
    expect(html).toContain('Overview');
    expect(html).not.toMatch(/data-observability-header=\"operator-sheet\"/);
    expect(html).not.toContain('linear-gradient');
    expect(html).not.toContain('Operator command deck');
    expect(html).not.toContain('Persistent context rail');
  });

  it('links the breadcrumb app mark from monitor.app when no list query context is present', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'mysql',
          status: 1,
          instance: 'mysql:3306'
        } as any}
        currentTab="realtime"
        refreshInterval={30}
        refreshCountdown={18}
        backHref="/monitors"
        editHref="/monitors/42/edit"
        appHref="/setting/define?app=mysql"
        navigationContext={{}}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        t={t}
      />
    );

    expect(html).toContain('data-monitor-detail-app-definition-link="angular-monitor-app"');
    expect(html).toContain('data-monitor-detail-app-definition-target="/setting/define?app=mysql"');
    expect(html).toContain('data-monitor-detail-list-return-target="/monitors"');
    expect(html).toContain('href="/setting/define?app=mysql"');
  });

  it('renders a scrape-derived app context passed by the detail route for non-static discovery monitors', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'node-exporter',
          app: 'website',
          scrape: 'prometheus',
          status: 1,
          instance: 'node-1:9100'
        } as any}
        currentTab="realtime"
        refreshInterval={90}
        refreshCountdown={90}
        backHref="/monitors?app=prometheus"
        editHref="/monitors/42/edit"
        helpHref="https://hertzbeat.apache.org/docs/help/prometheus"
        appHref="/setting/define?app=prometheus"
        navigationContext={{ app: 'prometheus' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        t={t}
      />
    );

    expect(html).toContain('data-monitor-detail-list-return-target="/monitors?app=prometheus"');
    expect(html).toContain('data-monitor-detail-app-definition-target="/setting/define?app=prometheus"');
    expect(html).toContain('data-monitor-detail-help-target="https://hertzbeat.apache.org/docs/help/prometheus"');
    expect(html).toContain('>prometheus</a>');
  });

  it('routes the outer monitor detail console shell through shared @hertzbeat/ui ownership', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');
    const uiLabSource = readFileSync(resolve(process.cwd(), 'app/ui-lab/page.tsx'), 'utf8');

    expect(uiSource).toContain('export function HzMonitorDetailConsoleShell');
    expect(uiSource).toContain('data-hz-ui="monitor-detail-console-shell"');
    expect(uiSource).toContain('data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"');
    expect(uiLabSource).toContain('data-hz-ui-lab-monitor-detail-console-shell="shared"');
    expect(source).toContain('HzMonitorDetailConsoleShell');
    expect(source).toContain('data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"');
    expect(source).toContain('data-monitor-console-layout="angular-workbench"');
    expect(source).toContain('data-monitor-first-viewport-rhythm="angular-tight"');
    expect(source).not.toContain('className="-mx-4 space-y-2 px-3 pb-3 pt-0 text-[var(--ops-text-primary)] sm:-mx-6 sm:px-3"');
    expect(source).not.toContain('style={cockpitSansStyle}');
  });

  it('routes the monitor detail tab workbench frame through shared @hertzbeat/ui ownership', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');
    const uiLabSource = readFileSync(resolve(process.cwd(), 'app/ui-lab/page.tsx'), 'utf8');

    expect(uiSource).toContain('export function HzMonitorDetailWorkbenchFrame');
    expect(uiSource).toContain('data-hz-ui="monitor-detail-workbench-frame"');
    expect(uiSource).toContain('data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(uiSource).toContain('data-monitor-detail-tabset-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(uiLabSource).toContain('data-hz-ui-lab-monitor-detail-workbench-frame="shared"');
    expect(source).toContain('HzMonitorDetailWorkbenchFrame');
    expect(source).toContain('data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(source).not.toContain('<section');
    expect(source).not.toContain('className="overflow-visible bg-transparent"');
    expect(source).not.toContain('className="pb-2"');
  });

  it('hides the grafana tab when no dashboard is available', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'http',
          status: 2,
          instance: '10.0.0.1'
        } as any}
        workbenchSummaryFacts={[
          { key: 'realtime', label: 'Real-time Metrics', value: '2' },
          { key: 'history', label: 'Historical Charts', value: '0' },
          { key: 'favorite', label: 'Favorites', value: '0' }
        ]}
        currentTab="realtime"
        refreshInterval={-1}
        refreshCountdown={-1}
        backHref="/monitors"
        editHref="/monitors/42/edit"
        helpHref={null}
        appHref={null}
        grafanaUrl={null}
        navigationContext={{ app: 'http' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        grafanaContent={null}
        t={t}
      />
    );

    expect(html).toContain('realtime stage');
    expect(html).toContain('Overview');
    expect(html).not.toContain('Open Grafana');
    expect(html).not.toContain('data-tab="grafana"');
    expect(html).toMatch(/data-monitor-refresh-select=\"true\"/);
    expect(html).toContain('Close Auto Refresh');
  });

  it('keeps the Angular default refresh deadline as the current toolbar value', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'http',
          status: 1,
          instance: '10.0.0.1'
        } as any}
        workbenchSummaryFacts={[{ key: 'realtime', label: 'Real-time Metrics', value: '2' }]}
        currentTab="realtime"
        refreshInterval={90}
        refreshCountdown={90}
        backHref="/monitors"
        editHref="/monitors/42/edit"
        helpHref={null}
        appHref="/setting/define?app=http"
        grafanaUrl={null}
        navigationContext={{ app: 'http' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        grafanaContent={null}
        t={t}
      />
    );

    expect(html).toContain('Auto Refresh After 90 s');
    expect(html).toContain('data-monitor-detail-default-refresh-contract="angular-deadline-90"');
    expect(html).toContain('data-monitor-detail-refresh-current-option="angular-default-deadline-current"');
    expect(html).toContain('aria-label="Auto Refresh After 90 s"');
  });

  it('routes refresh controls through the compact tab-extra toolbar rhythm', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain('data-monitor-refresh-toolbar-variant="compact-toolbar-extra"');
    expect(source).toContain('data-monitor-refresh-toolbar-position="tabbar-extra"');
    expect(source).toContain('HzMonitorRefreshToolbar');
    expect(source).toContain('data-hz-monitor-refresh-toolbar-layout="single-row-compact"');
    expect(source).toContain('extra={detailTabExtra}');
    expect(source).toContain('HzMonitorDetailTabs');
    expect(source).toContain('HzMonitorDetailTabLabel');
    expect(source).toContain('data-monitor-detail-tabs-owner="hertzbeat-ui-monitor-detail-tabs"');
    expect(source).toContain('data-monitor-detail-tab-label-owner="hertzbeat-ui-detail-tab-label"');
    expect(uiSource).toContain('data-monitor-detail-tabset-type="bottom-underline-switch"');
    expect(uiSource).toContain('data-hz-ui="monitor-detail-tab-label"');
    expect(uiSource).toContain('data-monitor-detail-tab-icon-owner="hertzbeat-ui-detail-tab-label"');
    expect(uiSource).toContain('data-monitor-refresh-select="true"');
    expect(source).toContain('RefreshCw');
    expect(source).not.toContain('className="inline-flex items-center gap-2"');
    expect(source).not.toContain('const refreshToolbar = (');
    expect(source).not.toContain('HzStatusBadge');
    expect(source).not.toContain('ObservabilityTabStrip');
    expect(source).not.toContain('data-refresh-selected=');
    expect(source).not.toContain('rounded-[2px] px-2 py-1 text-[11px] font-medium tracking-[0.03em] transition');
    expect(source).not.toContain("border-b border-[var(--ops-primary)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)]");
  });

  it('routes the app context through underline text without a pre-tab context rail', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');

    expect(source).toContain('HzInlineContextMark');
    expect(source).toContain('HzMonitorBreadcrumb');
    expect(source).toContain('data-monitor-detail-breadcrumb-owner="hertzbeat-ui-monitor-breadcrumb"');
    expect(source).toContain('data-monitor-detail-context-mark-owner="hertzbeat-ui-inline-context-mark"');
    expect(source).toContain('placement="breadcrumb"');
    expect(source).not.toContain('className="ml-1"');
    expect(source).not.toContain('monitor-detail-workbench-breadcrumb flex flex-wrap items-center gap-2 border-b border-[var(--ops-border-color)] pb-2 text-[11px] text-[var(--ops-text-tertiary)]');
    expect(source).not.toContain('HzBreadcrumbChip');
    expect(source).not.toContain('data-monitor-detail-app-chip-owner="hertzbeat-ui-breadcrumb-chip"');
    expect(source).not.toContain('ObservabilityControlChip');
    expect(source).not.toContain('ContextChipBar');
    expect(source).not.toContain('actions={');
    expect(source).not.toContain('data-monitor-detail-return-action="true"');
    expect(source).toContain("t('common.button.help')");
    expect(source).toContain('data-monitor-detail-tab-extra-contract="angular-refresh-help"');
    expect(source).toContain("t('monitor.detail.entity-draft')");
    expect(source).toContain('data-monitor-detail-entity-draft-action="telemetry-monitor-seed"');
    expect(source).toContain('data-monitor-detail-entity-draft-owner="hertzbeat-ui-labeled-action-link"');
    expect(source).toContain('data-monitor-detail-entity-draft-visibility="visible-label"');
    expect(source).toContain('data-monitor-detail-entity-draft-target={entityDraftHref}');
    expect(source).toContain('data-monitor-detail-help-action="angular-docs-help"');
    expect(source).toContain('data-monitor-detail-help-owner="hertzbeat-ui-icon-link"');
    expect(source).not.toContain("t('monitor.edit-monitor')");
    expect(source).toContain('data-monitor-detail-header-mode="breadcrumb-only"');
    expect(source).toContain('data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"');
    expect(source).toContain('data-monitor-detail-context-mark="breadcrumb"');
    expect(source).not.toContain('data-monitor-detail-app-chip="breadcrumb"');
    expect(source).not.toContain('data-monitor-header-layout="angular-context-rail"');
    expect(source).not.toContain('data-monitor-header-proportion="angular-reference"');
    expect(source).not.toContain('data-monitor-header-context-rail="true"');
    expect(source).not.toContain('data-monitor-header-context-rail-density="angular-stacked"');
    expect(source).not.toContain('data-monitor-header-rail-align="title-block"');
    expect(source).not.toContain('data-monitor-header-kicker="angular-workbench"');
    expect(source).not.toContain('data-monitor-header-copy="angular-workbench"');
    expect(source).not.toContain('monitor-detail-workbench-header__chips');
    expect(source).not.toContain('monitor-detail-workbench-header__context-stack');
    expect(source).not.toContain('variant="header"');
    expect(source).not.toContain('monitor.detail.workbench.kicker');
    expect(source).not.toContain('monitor.detail.workbench.copy');
    expect(source).not.toContain("subtitle={monitor.instance || t('monitor.detail.subtitle')}");
    expect(source).not.toContain('const chromeActionClass =');
    expect(source).not.toContain('ml-1 inline-flex items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]');
  });

  it('does not render redundant workbench summary facts above monitor detail tabs', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');

    expect(source).not.toContain('const workbenchSummaryStrip =');
    expect(source).not.toContain('data-monitor-console-facts="workbench-summary"');
    expect(source).not.toContain('data-monitor-workbench-summary-facts="angular-workbench"');
    expect(source).not.toContain('data-monitor-workbench-summary-rhythm="angular-chip-row"');
    expect(source).not.toContain('data-monitor-workbench-summary-density="angular-pill-toolbar"');
    expect(source).not.toContain('data-monitor-workbench-summary-strip-variant="angular-chip-row"');
    expect(source).not.toContain('data-monitor-workbench-summary-item={fact.key}');
  });

  it('keeps monitor detail first viewport on tight vertical rhythm', () => {
    const consoleSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(consoleSource).toContain('data-monitor-first-viewport-rhythm="angular-tight"');
    expect(consoleSource).toContain('data-monitor-detail-history-tab-load="angular-click-load-metric-chart"');
    expect(consoleSource).toContain('data-monitor-detail-realtime-tab-load="angular-click-load-real-time-metric"');
    expect(consoleSource).toContain('data-monitor-detail-favorite-tab-load="angular-click-load-favorite-metrics"');
    expect(consoleSource).toContain('data-monitor-detail-grafana-fallback-tab="angular-previous-data-tab"');
    expect(consoleSource).toContain('data-monitor-detail-completion-guard="reported-angular-no-card-stack"');
    expect(consoleSource).toContain('data-monitor-detail-body-stack-state="single-workbench-table-rows"');
    expect(consoleSource).toContain('data-monitor-detail-completion-header="breadcrumb-only"');
    expect(consoleSource).toContain('data-monitor-detail-header-mode="breadcrumb-only"');
    expect(consoleSource).toContain('data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"');
    expect(consoleSource).toContain('data-monitor-detail-breadcrumb-owner="hertzbeat-ui-monitor-breadcrumb"');
    expect(consoleSource).toContain('HzMonitorDetailConsoleShell');
    expect(consoleSource).toContain('data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"');
    expect(consoleSource).toContain('HzMonitorDetailWorkbenchFrame');
    expect(consoleSource).toContain('data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(consoleSource).not.toContain('monitor-detail-workbench-breadcrumb flex flex-wrap items-center gap-2 border-b border-[var(--ops-border-color)] pb-2 text-[11px] text-[var(--ops-text-tertiary)]');
    expect(consoleSource).toContain('HzMonitorDetailTabPanel');
    expect(consoleSource).toContain('data-monitor-console-tab-panel-owner="hertzbeat-ui-detail-tab-panel"');
    expect(consoleSource).not.toContain('data-monitor-console-tab-panel-rhythm="angular-tight"');
    expect(consoleSource).not.toContain('data-monitor-header-proportion="angular-reference"');
    expect(consoleSource).not.toContain('data-monitor-header-rail-align="title-block"');
    expect(consoleSource).not.toContain('ObservabilityPageHeader');
    expect(consoleSource).not.toContain('monitor-detail-page-frame');
    expect(uiSource).toContain('-mx-4 space-y-2 px-3 pb-3 pt-0');
    expect(uiSource).toContain('sm:-mx-6 sm:px-3');
    expect(consoleSource).not.toContain('-mx-4 space-y-2 px-3 pb-3 pt-0');
    expect(consoleSource).not.toContain('px-3 py-3');
    expect(consoleSource).not.toContain('monitor-detail-workbench-breadcrumb');
    expect(consoleSource).toContain('HzMonitorBreadcrumb');
    expect(consoleSource).toContain('data-monitor-detail-breadcrumb-owner="hertzbeat-ui-monitor-breadcrumb"');
    expect(consoleSource).not.toContain('border-b border-[var(--ops-border-color)] pb-2');
    expect(consoleSource).not.toContain('monitor-detail-workbench-header grid gap-2');
    expect(consoleSource).not.toContain('pb-2 xl:grid-cols-[minmax(0,1fr)_minmax(168px,190px)]');
    expect(consoleSource).not.toContain('monitor-detail-workbench-header__chips');
    expect(consoleSource).not.toContain('data-monitor-header-context-rail-density="angular-stacked"');
    expect(consoleSource).toContain('data-monitor-workbench-stage="angular-layout"');
    expect(consoleSource).toContain('data-monitor-workbench-stage-chrome="angular-tabset-direct"');
    expect(consoleSource).toContain('data-monitor-workbench-stage-rhythm="direct-tab-body"');
    expect(uiSource).toContain('data-monitor-detail-tabset-type="bottom-underline-switch"');
    expect(uiSource).toContain('overflow-visible bg-transparent');
    expect(consoleSource).not.toContain('className="overflow-visible bg-transparent"');
    expect(consoleSource).not.toContain('monitor-detail-workbench-layout');
    expect(consoleSource).not.toContain('data-monitor-tab-body-surface="angular-tab-content-direct"');
    expect(uiSource).toContain("cn('pb-2'");
    expect(consoleSource).not.toContain('className="pb-2"');
    expect(consoleSource).not.toContain('className="-mx-4 space-y-2 px-3 pb-3 pt-0 text-[var(--ops-text-primary)] sm:-mx-6 sm:px-3"');
    expect(consoleSource).not.toContain('monitor-detail-workbench-tabs');
    expect(consoleSource).not.toContain('className="space-y-2"');
    expect(consoleSource).not.toContain('className="space-y-2 px-3 pb-3"');
    expect(consoleSource).not.toContain('monitor-detail-page-frame space-y-4');
    expect(consoleSource).not.toContain('monitor-detail-page-frame -mx-4 space-y-3');
    expect(consoleSource).not.toContain('px-4 py-4');
    expect(consoleSource).not.toContain('sm:px-4');
    expect(consoleSource).not.toContain('monitor-detail-workbench-header grid gap-3');
    expect(consoleSource).not.toContain('monitor-detail-workbench-layout space-y-3');
    expect(consoleSource).not.toContain('monitor-detail-workbench-layout space-y-2');
    expect(consoleSource).not.toContain('monitor-detail-workbench-tabs pb-3');
    expect(consoleSource).not.toContain('className="space-y-4"');
  });

  it('routes the refresh countdown toolbar through shared @hertzbeat/ui primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).toContain('HzMonitorRefreshToolbar');
    expect(source).toContain('data-monitor-refresh-toolbar-density="inline-quiet-controls"');
    expect(source).toContain('data-hz-monitor-refresh-toolbar-layout="single-row-compact"');
    expect(source).toContain('data-monitor-detail-refresh-copy-contract="angular-deadline-label"');
    expect(source).toContain("t('monitor.detail.auto-refresh', { time: refreshCountdown })");
    expect(source).toContain("t('monitor.detail.close-refresh')");
    expect(source).not.toContain('monitor.detail.refresh-countdown');
    expect(source).not.toContain('monitor.detail.refresh-disabled');
    expect(source).not.toContain('HzStatusBadge');
    expect(source).not.toContain('HzButton');
    expect(uiSource).toContain('HzStatusBadge');
    expect(uiSource).toContain('HzButton');
    expect(uiSource).toContain('data-monitor-refresh-toolbar-owner="hertzbeat-ui-refresh-toolbar"');
    expect(uiSource).toContain('data-monitor-refresh-badge-owner="hertzbeat-ui-status-badge"');
    expect(uiSource).toContain('data-monitor-refresh-action-owner="hertzbeat-ui-button"');
    expect(uiSource).toContain('data-monitor-refresh-command-action="refresh"');
    expect(uiSource).toContain('data-monitor-refresh-badge-variant="quiet"');
    expect(uiSource).toContain('data-monitor-refresh-select-density="quiet"');
    expect(uiSource).toContain('data-monitor-refresh-action-density="quiet"');
    expect(uiSource).toContain('data-monitor-refresh-control-baseline="control-32-lined"');
    expect(uiSource).toContain('data-hz-control-height="32"');
    expect(uiSource).toContain('data-hz-control-height="28"');
    expect(uiSource).toContain('data-hz-control-edge="lined"');
    expect(source).not.toContain('signalHandoffLinks');
    expect(source).not.toContain("id: 'metrics'");
    expect(source).not.toContain("id: 'logs'");
    expect(source).not.toContain("id: 'traces'");
    expect(uiSource).toContain('className="h-7 w-7');
    expect(uiSource).not.toContain('border-transparent bg-transparent text-[#98a2b3]');
    expect(uiSource).not.toContain('data-monitor-refresh-badge-variant="bordered"');
    expect(uiSource).not.toContain('data-monitor-refresh-select-density="bordered"');
    expect(uiSource).not.toContain('data-monitor-refresh-action-density="bordered"');
    expect(source).not.toContain('ObservabilityBadge');
    expect(source).not.toContain('variant="underline"');
    expect(source).not.toContain('rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] text-[var(--ops-text-tertiary)]');
    expect(source).not.toContain("from '../workbench/primitives'");
  });

  it('does not render monitor detail signal handoff actions in the tab toolbar', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'http',
          status: 1,
          instance: '10.0.0.1'
        } as any}
        workbenchSummaryFacts={[{ key: 'realtime', label: 'Real-time Metrics', value: '2' }]}
        currentTab="realtime"
        refreshInterval={30}
        refreshCountdown={18}
        backHref="/monitors?app=http"
        editHref="/monitors/42/edit?app=http"
        helpHref={null}
        appHref="/setting/define?app=http"
        grafanaUrl={null}
        navigationContext={{ app: 'http' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        grafanaContent={null}
        t={t}
      />
    );

    expect(html).not.toContain('data-monitor-signal-handoff="compact-actions"');
    expect(html).not.toContain('data-monitor-signal-handoff-owner="hertzbeat-ui-icon-link-group"');
    expect(html).not.toContain('data-monitor-signal-handoff-link-owner="hertzbeat-ui-icon-link"');
    expect(html).not.toContain('data-monitor-signal-handoff-link="metrics"');
    expect(html).not.toContain('data-monitor-signal-handoff-link="logs"');
    expect(html).not.toContain('data-monitor-signal-handoff-link="traces"');
    expect(html).not.toContain('/ingestion/otlp/metrics?timeRange=last-1h&amp;monitorId=42&amp;source=monitor');
    expect(html).not.toContain('/log/manage?timeRange=last-1h&amp;monitorId=42&amp;source=monitor');
    expect(html).not.toContain('/trace/manage?timeRange=last-1h&amp;monitorId=42&amp;source=monitor');
    expect(html).not.toContain('Metrics Workbench');
    expect(html).not.toContain('Logs Workbench');
    expect(html).not.toContain('Traces Workbench');
    expect(html).not.toContain('data-monitor-signal-fake-card');
    expect(html).not.toContain('data-monitor-signal-fake-count');
    expect(html).not.toContain('0 signals');
    expect(html).not.toContain('No signal data');
  });

  it('does not route monitor signal handoff buttons into the detail toolbar', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');

    expect(source).toContain('HzMonitorRefreshToolbar');
    expect(source).not.toContain('signalHandoffLinks');
    expect(source).not.toContain("id: 'metrics'");
    expect(source).not.toContain("id: 'logs'");
    expect(source).not.toContain("id: 'traces'");
    expect(source).toContain('HzIconLink');
    expect(source).toContain('data-monitor-detail-help-action="angular-docs-help"');
    expect(source).toContain('data-monitor-detail-entity-draft-visibility="visible-label"');
  });

  it('does not render a pre-tab overview slot on monitor detail pages', () => {
    const html = renderToStaticMarkup(
      <MonitorDetailConsole
        monitor={{
          id: 42,
          name: 'checkout-core',
          app: 'http',
          status: 1,
          instance: '10.0.0.1'
        } as any}
        workbenchSummaryFacts={[{ key: 'realtime', label: 'Real-time Metrics', value: '2' }]}
        currentTab="realtime"
        refreshInterval={30}
        refreshCountdown={18}
        backHref="/monitors?app=http"
        editHref="/monitors/42/edit?app=http"
        helpHref={null}
        appHref="/setting/define?app=http"
        grafanaUrl={null}
        navigationContext={{ app: 'http' }}
        onSelectTab={() => {}}
        onSelectRefreshInterval={() => {}}
        onRefresh={() => {}}
        realtimeContent={<div>realtime stage</div>}
        historyContent={<div>history stage</div>}
        favoritesContent={<div>favorites stage</div>}
        grafanaContent={null}
        t={t}
      />
    );

    expect(html).not.toContain('legacy overview card stack');
    expect(html).not.toMatch(/data-monitor-console-overview=\"true\"/);
  });
});
