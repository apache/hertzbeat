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

    expect(html).toContain('监控列表');
    expect(html).toContain('监控详情');
    expect(html).toContain('监控实时数据详情');
    expect(html).toContain('data-monitor-detail-header-mode="breadcrumb-only"');
    expect(html).toContain('data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"');
    expect(html).toContain('data-monitor-detail-app-chip="breadcrumb"');
    expect(html).not.toContain('监控工作台');
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
    expect(html).not.toContain('checkout-core');
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
    expect(html).not.toContain('Monitor ID');
    expect(html).not.toContain('Status</div>');
    expect(html).not.toContain('Updated</div>');
    expect(html).toContain('10s');
    expect(html).toContain('30s');
    expect(html).toContain('300s');
    expect(html).toContain('Off');
    expect(html).toContain('Refresh');
    expect(html).toContain('Refresh soon 18s');
    expect(html).not.toContain('Back to monitors');
    expect(html).not.toContain('Edit monitor');
    expect(html).not.toContain('Help');
    expect(html).not.toContain('Open Grafana');
    expect(html).toContain('grafana stage');
    expect(html).toContain('/setting/define?app=http');
    expect(html).not.toContain('https://hertzbeat.apache.org/docs/help/http');
    expect(html).toMatch(/data-monitor-console-layout=\"angular-workbench\"/);
    expect(html).toMatch(/data-monitor-console-tone=\"operator-sheet\"/);
    expect(html).toMatch(/data-monitor-detail-completion-guard=\"reported-angular-no-card-stack\"/);
    expect(html).toMatch(/data-monitor-detail-body-stack-state=\"single-workbench-table-rows\"/);
    expect(html).toMatch(/data-monitor-detail-completion-header=\"breadcrumb-only\"/);
    expect(html).toMatch(/data-monitor-first-viewport-rhythm=\"angular-tight\"/);
    expect(html).toMatch(/data-monitor-detail-header-mode=\"breadcrumb-only\"/);
    expect(html).toMatch(/data-monitor-detail-reference-source=\"apache-hertzbeat-master-monitor-detail\"/);
    expect(html).toMatch(/data-monitor-detail-app-chip=\"breadcrumb\"/);
    expect(html).toMatch(/data-monitor-console-tab-panel=\"true\"/);
    expect(html).toMatch(/data-monitor-console-tab-panel-rhythm=\"angular-tight\"/);
    expect(html).not.toMatch(/data-monitor-detail-return-action=\"true\"/);
    expect(html).toMatch(/class=\"[^\"]*monitor-detail-page-frame[^\"]*-mx-4[^\"]*space-y-2[^\"]*px-3[^\"]*py-3[^\"]*sm:-mx-6[^\"]*sm:px-3/);
    expect(html).toMatch(/class=\"[^\"]*monitor-detail-workbench-breadcrumb[^\"]*border-b[^\"]*pb-2/);
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
    expect(html).toMatch(/class=\"[^\"]*monitor-detail-workbench-layout[^\"]*overflow-visible[^\"]*bg-transparent/);
    expect(html).toMatch(/data-monitor-workbench-stage=\"angular-layout\"/);
    expect(html).toMatch(/data-monitor-workbench-stage-chrome=\"angular-tabset-direct\"/);
    expect(html).toMatch(/data-monitor-workbench-stage-rhythm=\"direct-tab-body\"/);
    expect(html).toMatch(/data-monitor-tab-body-surface=\"angular-tab-content-direct\"/);
    expect(html).not.toMatch(/data-monitor-workbench-stage-chrome=\"single-sheet\"/);
    expect(html).not.toMatch(/data-monitor-tab-body-surface=\"unified-stage\"/);
    expect(html).toMatch(/data-monitor-detail-tabset-type=\"angular-card\"/);
    expect(html).toMatch(/data-observability-tabstrip-variant=\"card\"/);
    expect(html).toMatch(/data-observability-tabstrip-card=\"angular-nz-card\"/);
    expect(html).toMatch(/data-observability-tab-card=\"true\"/);
    expect(html).toMatch(/class=\"[^\"]*monitor-detail-workbench-tabs[^\"]*pb-2/);
    expect(html).not.toMatch(/data-monitor-header-context-rail=\"true\"/);
    expect(html).not.toMatch(/<p[^>]*>10\.0\.0\.1<\/p>/);
    expect(html.indexOf('data-monitor-detail-header-mode=\"breadcrumb-only\"')).toBeLessThan(
      html.indexOf('data-monitor-workbench-stage=\"angular-layout\"')
    );
    expect(html).toMatch(/data-monitor-refresh-toolbar-variant=\"angular-tab-extra\"/);
    expect(html).toMatch(/data-monitor-refresh-toolbar-position=\"tabbar-extra\"/);
    expect(html).toMatch(/data-monitor-refresh-toolbar-density=\"angular-bordered-controls\"/);
    expect(html).toMatch(/data-monitor-refresh-badge-variant=\"bordered\"/);
    expect(html).toMatch(/data-monitor-refresh-select-density=\"bordered\"/);
    expect(html).toMatch(/data-monitor-refresh-action-density=\"bordered\"/);
    expect(html).toMatch(/data-observability-tabstrip-extra=\"true\"/);
    expect(html).not.toMatch(/data-observability-tab-indicator=\"underline\"/);
    expect(html.indexOf('role=\"tablist\"')).toBeLessThan(html.indexOf('data-monitor-refresh-toolbar-variant=\"angular-tab-extra\"'));
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
    expect(html).toContain('Auto refresh off');
  });

  it('routes refresh controls through the compact tab-extra toolbar rhythm', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');

    expect(source).toContain('data-monitor-refresh-toolbar-variant="angular-tab-extra"');
    expect(source).toContain('data-monitor-refresh-toolbar-position="tabbar-extra"');
    expect(source).toContain('extra={refreshToolbar}');
    expect(source).toContain('variant="card"');
    expect(source).toContain('data-monitor-detail-tabset-type="angular-card"');
    expect(source).toContain('data-monitor-refresh-select="true"');
    expect(source).toContain('RefreshCw');
    expect(source).not.toContain('data-refresh-selected=');
    expect(source).not.toContain('rounded-[2px] px-2 py-1 text-[11px] font-medium tracking-[0.03em] transition');
    expect(source).not.toContain("border-b border-[var(--ops-primary)] bg-[var(--ops-surface-panel)] text-[var(--ops-text-primary)]");
  });

  it('routes the app badge through the breadcrumb owner without a pre-tab context rail', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');

    expect(source).toContain('ObservabilityControlChip');
    expect(source).not.toContain('ContextChipBar');
    expect(source).not.toContain('actions={');
    expect(source).not.toContain('data-monitor-detail-return-action="true"');
    expect(source).not.toContain("t('common.button.help')");
    expect(source).not.toContain("t('monitor.edit-monitor')");
    expect(source).toContain('data-monitor-detail-header-mode="breadcrumb-only"');
    expect(source).toContain('data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"');
    expect(source).toContain('data-monitor-detail-app-chip="breadcrumb"');
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

    expect(consoleSource).toContain('data-monitor-first-viewport-rhythm="angular-tight"');
    expect(consoleSource).toContain('data-monitor-detail-completion-guard="reported-angular-no-card-stack"');
    expect(consoleSource).toContain('data-monitor-detail-body-stack-state="single-workbench-table-rows"');
    expect(consoleSource).toContain('data-monitor-detail-completion-header="breadcrumb-only"');
    expect(consoleSource).toContain('data-monitor-detail-header-mode="breadcrumb-only"');
    expect(consoleSource).toContain('data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"');
    expect(consoleSource).toContain('data-monitor-console-tab-panel-rhythm="angular-tight"');
    expect(consoleSource).not.toContain('data-monitor-header-proportion="angular-reference"');
    expect(consoleSource).not.toContain('data-monitor-header-rail-align="title-block"');
    expect(consoleSource).not.toContain('ObservabilityPageHeader');
    expect(consoleSource).toContain('monitor-detail-page-frame -mx-4 space-y-2');
    expect(consoleSource).toContain('-mx-4');
    expect(consoleSource).toContain('px-3 py-3');
    expect(consoleSource).toContain('sm:-mx-6');
    expect(consoleSource).toContain('sm:px-3');
    expect(consoleSource).toContain('monitor-detail-workbench-breadcrumb');
    expect(consoleSource).toContain('border-b border-[var(--ops-border-color)] pb-2');
    expect(consoleSource).not.toContain('monitor-detail-workbench-header grid gap-2');
    expect(consoleSource).not.toContain('pb-2 xl:grid-cols-[minmax(0,1fr)_minmax(168px,190px)]');
    expect(consoleSource).not.toContain('monitor-detail-workbench-header__chips');
    expect(consoleSource).not.toContain('data-monitor-header-context-rail-density="angular-stacked"');
    expect(consoleSource).toContain('data-monitor-workbench-stage="angular-layout"');
    expect(consoleSource).toContain('data-monitor-workbench-stage-chrome="angular-tabset-direct"');
    expect(consoleSource).toContain('data-monitor-workbench-stage-rhythm="direct-tab-body"');
    expect(consoleSource).toContain('data-monitor-detail-tabset-type="angular-card"');
    expect(consoleSource).toContain('monitor-detail-workbench-layout overflow-visible bg-transparent');
    expect(consoleSource).not.toContain('monitor-detail-workbench-layout overflow-hidden');
    expect(consoleSource).not.toContain('monitor-detail-workbench-layout overflow-hidden border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
    expect(consoleSource).toContain('data-monitor-tab-body-surface="angular-tab-content-direct"');
    expect(consoleSource).toContain('monitor-detail-workbench-tabs pb-2');
    expect(consoleSource).not.toContain('monitor-detail-workbench-tabs px-3 pb-2 pt-2');
    expect(consoleSource).toContain('className="space-y-2"');
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

  it('routes the refresh countdown badge through the observability badge owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');

    expect(source).toContain('ObservabilityBadge');
    expect(source).toContain('data-monitor-refresh-toolbar-density="angular-bordered-controls"');
    expect(source).toContain('data-monitor-refresh-badge-variant="bordered"');
    expect(source).toContain('data-monitor-refresh-select-density="bordered"');
    expect(source).toContain('data-monitor-refresh-action-density="bordered"');
    expect(source).toContain('border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
    expect(source).not.toContain('variant="underline"');
    expect(source).not.toContain('border-transparent bg-transparent');
    expect(source).not.toContain('rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] text-[var(--ops-text-tertiary)]');
    expect(source).not.toContain("from '../workbench/primitives'");
  });

  it('shows compact signal handoff actions without fake signal cards or counts', () => {
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
        signalHandoffLinks={{
          metricsHref: '/ingestion/otlp/metrics?timeRange=last-1h&monitorId=42&source=monitor',
          logsHref: '/log/manage?timeRange=last-1h&monitorId=42&source=monitor',
          tracesHref: '/trace/manage?timeRange=last-1h&monitorId=42&source=monitor'
        }}
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

    expect(html).toContain('data-monitor-signal-handoff="compact-actions"');
    expect(html).toContain('data-monitor-signal-handoff-source="context-only"');
    expect(html).toContain('data-monitor-signal-handoff-link="metrics"');
    expect(html).toContain('data-monitor-signal-handoff-link="logs"');
    expect(html).toContain('data-monitor-signal-handoff-link="traces"');
    expect(html).toContain('/ingestion/otlp/metrics?timeRange=last-1h&amp;monitorId=42&amp;source=monitor');
    expect(html).toContain('/log/manage?timeRange=last-1h&amp;monitorId=42&amp;source=monitor');
    expect(html).toContain('/trace/manage?timeRange=last-1h&amp;monitorId=42&amp;source=monitor');
    expect(html).toContain('Metrics Workbench');
    expect(html).toContain('Logs Workbench');
    expect(html).toContain('Traces Workbench');
    expect(html).not.toContain('data-monitor-signal-fake-card');
    expect(html).not.toContain('data-monitor-signal-fake-count');
    expect(html).not.toContain('0 signals');
    expect(html).not.toContain('No signal data');
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
