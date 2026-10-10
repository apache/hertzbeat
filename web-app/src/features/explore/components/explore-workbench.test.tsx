import { useRecentLogSearches } from '../controller/use-recent-log-searches';
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/en-us.json';

import { useLogQueryBuilder } from '../controller/use-log-query-builder';
import { ExploreQueryBar } from './explore-query-bar';
import { ExploreLogMode } from './explore-log-mode';
import { ExploreTimeControl } from './explore-time-control';
import { ExploreSignalTimeToolbar } from './explore-signal-time-toolbar';
import { LOG_QUERY_EDITOR_MODE_STORAGE_KEY } from './explore-log-editor-mode';
import { ExploreWorkbench } from './explore-workbench';
import historyStylesSource from './explore-history-result.module.css?raw';
import logQueryBuilderStylesSource from './explore-log-query-builder.module.css?raw';
import queryStylesSource from './explore-query-bar.module.css?raw';
import workbenchStylesSource from './explore-workbench.module.css?raw';
import type { ExploreQueryPatch } from '../model/explore-model';
import { draftFromQuery } from '../model/explore-submission-model';
import { DEFAULT_LOG_ANALYSIS, migrateLogQuerySet } from '@/platform/perses';
import type { SharedTimeValue } from '@/shared/time';

describe('Explore workbench', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('keeps one accessible query command region with query, time, refresh, and Run controls', () => {
    const updateQuery = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <WorkbenchSubject updateQuery={updateQuery} />
      </I18nextProvider>
    );

    const command = screen.getByRole('form', { name: 'Explore query controls' });
    expect(within(command).getByRole('textbox', { name: i18n.t('explore.queryLabels.metrics') })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Time range' })).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: /Auto refresh/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(within(command).getByRole('button', { name: 'Query' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).not.toContainElement(
      document.querySelector('[data-hb-operational-page-actions]')
    );
    expect(screen.getByRole('heading', { name: 'Metrics' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: i18n.t('explore.signalsNavigation') })).not.toBeInTheDocument();
    expect(updateQuery).not.toHaveBeenCalled();
  });

  it('keeps results outside query forms while filter Enter submits the same draft', () => {
    const submit = vi.fn();
    const query = { signal: 'traces', timeRange: 'last-30m' } as const;
    render(
      <I18nextProvider i18n={i18n}>
        <QueryBarWithEditor
          query={query}
          t={i18n.t}
          updateQuery={vi.fn()}
          updateScope={vi.fn()}
          refresh={vi.fn()}
          time={sharedTime()}
          submission={{
            draft: draftFromQuery(query),
            errors: {},
            updateField: vi.fn(),
            submit,
            removeFilter: vi.fn(),
            removeFilters: vi.fn(),
            applyLogPatch: vi.fn(),
            resetDraft: vi.fn()
          }}
          results={
            <section aria-label="Trace results proof">
              <button type="button">Inspect evidence</button>
            </section>
          }
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('region', { name: 'Trace results proof' }).closest('form')).toBeNull();
    fireEvent.submit(screen.getByRole('form', { name: i18n.t('explore.addFilters') }));
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('button', { name: 'Query' })).toHaveLength(1);
  });

  it('keeps Builder or Code as a local preference and forces exact unparseable URL filters into Code', () => {
    const first = render(
      <I18nextProvider i18n={i18n}>
        <QuerySubject />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Code' }));
    expect(localStorage.getItem(LOG_QUERY_EDITOR_MODE_STORAGE_KEY)).toBe('code');
    first.unmount();

    const persisted = render(
      <I18nextProvider i18n={i18n}>
        <QuerySubject />
      </I18nextProvider>
    );
    expect(screen.getByRole('radio', { name: 'Code' })).toBeChecked();
    persisted.unmount();
    localStorage.removeItem(LOG_QUERY_EDITOR_MODE_STORAGE_KEY);

    render(
      <I18nextProvider i18n={i18n}>
        <QuerySubject query={{ signal: 'logs', timeRange: 'last-30m', resourceFilter: 'service.name LIKE checkout' }} />
      </I18nextProvider>
    );
    expect(screen.getByRole('radio', { name: 'Code' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Builder' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Resource filter code' })).toHaveValue('service.name LIKE checkout');
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('explore.logQueryBuilder.losslessError'));
    expect(screen.getByRole('textbox', { name: 'Resource filter code' })).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('offers only shared auto-refresh values for relative windows', () => {
    const time = sharedTime();
    render(
      <I18nextProvider i18n={i18n}>
        <WorkbenchSubject updateQuery={vi.fn()} time={time} />
      </I18nextProvider>
    );

    fireEvent.mouseDown(
      screen.getByRole('combobox', {
        name: /Auto refresh/u
      })
    );
    fireEvent.click(screen.getByText('Auto refresh 30s'));
    expect(time.setAutoRefresh).toHaveBeenCalledWith(30_000);
  });

  it('places generic Logs time and mode in the heading without a second signal switcher', () => {
    const updateScope = vi.fn();
    const query = { signal: 'logs', timeRange: 'last-30m' } as const;
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench
          query={query}
          t={i18n.t}
          updateQuery={vi.fn()}
          actions={<button>Saved queries</button>}
          timeToolbar={
            <>
              <ExploreTimeControl query={query} t={i18n.t} updateScope={updateScope} time={sharedTime()} />
              <ExploreLogMode query={query} draft={draftFromQuery(query)} t={i18n.t} updateScope={updateScope} />
            </>
          }
        />
        <QuerySubject updateScope={updateScope} />
      </I18nextProvider>
    );

    expect(screen.queryByRole('tablist', { name: i18n.t('explore.signalsNavigation') })).not.toBeInTheDocument();
    const mode = within(screen.getByRole('banner')).getByRole('radiogroup', {
      name: 'Log mode'
    });
    const command = screen.getByRole('form', { name: 'Explore query controls' });
    expect(within(command).queryByRole('combobox', { name: /Auto refresh/u })).not.toBeInTheDocument();
    expect(within(mode).getByRole('radio', { name: 'History' })).toBeChecked();
    fireEvent.click(within(mode).getByRole('radio', { name: 'Live' }));
    expect(updateScope).toHaveBeenCalledWith({ live: true });
    expect(screen.queryByRole('tab', { name: 'Query' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('form', { name: 'Explore query controls' })).getByRole('button', { name: 'Query' })
    ).toHaveClass('ant-btn-primary');
    expect(within(screen.getByRole('banner')).getAllByRole('textbox', { name: 'Time range' })).toHaveLength(2);
    expect(within(command).getByRole('combobox', { name: 'Logs query' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('keeps query-set analysis in history mode', () => {
    const updateScope = vi.fn();
    const query = { signal: 'logs', timeRange: 'last-30m' } as const;
    const draft = {
      ...draftFromQuery(query),
      logAnalysis: JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        querySet: migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, '')
      })
    };
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogMode query={query} draft={draft} t={i18n.t} updateScope={updateScope} />
      </I18nextProvider>
    );
    const live = screen.getByRole('radio', { name: 'Live' });
    expect(live).toBeDisabled();
    fireEvent.click(live);
    expect(updateScope).not.toHaveBeenCalled();
  });

  it('keeps Live disabled while an applied query set has a pending plain-search draft', () => {
    const updateScope = vi.fn();
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      logAnalysis: JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        querySet: migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, '')
      })
    };
    const draft = { ...draftFromQuery(query), logAnalysis: undefined };
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogMode query={query} draft={draft} t={i18n.t} updateScope={updateScope} />
      </I18nextProvider>
    );
    expect(screen.getByRole('radio', { name: 'Live' })).toBeDisabled();
  });

  it('keeps Live disabled for applied calculated fields even with a pending plain-search draft', () => {
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      logCalculatedV2: JSON.stringify({
        version: 2,
        nextFieldSeq: 2,
        fields: [{ id: 'c1', kind: 'formula', name: 'durationSeconds', expression: '@duration_ms / 1000' }]
      }),
      searchSyntax: 'structured-v2'
    };
    const draft = draftFromQuery(query);
    if (draft.signal !== 'logs') throw new Error('Expected logs draft');
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogMode
          query={query}
          draft={{ ...draft, logCalculatedV2: undefined }}
          t={i18n.t}
          updateScope={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('radio', { name: 'Live' })).toBeDisabled();
  });

  it('uses a plain Logs heading with no in-page signal switch', () => {
    const updateQuery = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench query={{ signal: 'logs', timeRange: 'last-30m' }} t={i18n.t} updateQuery={updateQuery} />
      </I18nextProvider>
    );
    const heading = screen.getByRole('heading', { name: 'Logs' });
    expect(heading).toHaveAttribute('id', 'explore-heading-logs');
    expect(within(heading).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: i18n.t('explore.signalsNavigation') })).not.toBeInTheDocument();
    expect(updateQuery).not.toHaveBeenCalled();
  });

  it('separates the Logs page title from the current view and time toolbar', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench
          query={{ signal: 'logs', timeRange: 'last-30m' }}
          t={i18n.t}
          updateQuery={vi.fn()}
          actions={<button>My View</button>}
          timeToolbar={<button>Time range</button>}
        />
      </I18nextProvider>
    );

    const headingRow = screen.getByRole('heading', { name: 'Logs' }).closest('[data-signal-header-level]');
    const viewRow = screen.getByRole('button', { name: 'My View' }).closest('[data-signal-header-level]');
    expect(headingRow).toHaveAttribute('data-signal-header-level', 'title');
    expect(viewRow).toHaveAttribute('data-signal-header-level', 'tools');
    expect(headingRow).not.toBe(viewRow);
    expect(viewRow).toContainElement(screen.getByRole('button', { name: 'Time range' }));
  });

  it('labels the Metrics heading for its result region without in-page signal tabs', () => {
    const updateQuery = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench query={{ signal: 'metrics', timeRange: 'last-30m' }} t={i18n.t} updateQuery={updateQuery} />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: 'Metrics' })).toHaveAttribute('id', 'explore-heading-metrics');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(updateQuery).not.toHaveBeenCalled();
  });

  it('keeps the other signal workflow guide and actions without signal tabs', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench
          query={{ signal: 'metrics', timeRange: 'last-30m' }}
          t={i18n.t}
          updateQuery={vi.fn()}
          actions={<button>Saved queries</button>}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('banner')).toHaveTextContent(i18n.t('explore.signals.metrics'));
    expect(screen.getByRole('banner')).toContainElement(screen.getByRole('button', { name: 'Saved queries' }));
    expect(screen.getByText(i18n.t('explore.description'))).not.toBeVisible();
    fireEvent.click(screen.getByText(i18n.t('explore.workflowGuide.summary')));
    expect(screen.getByText(i18n.t('explore.description'))).toBeVisible();
    expect(screen.getByRole('banner')).not.toContainElement(screen.queryByRole('tablist'));
    expect(workbenchStylesSource).toMatch(/\.toolbarRow\s*\{[^}]*display:\s*flex/s);
    expect(workbenchStylesSource).toMatch(/\.resultRegion\s*\{[^}]*overflow:\s*auto/s);
    expect(workbenchStylesSource).toMatch(
      /\.workspace\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow:\s*hidden/s
    );
    expect(workbenchStylesSource).toMatch(/\.signalPanel\s*\{[^}]*display:\s*flex[^}]*min-height:\s*0[^}]*flex:\s*1/s);
    expect(queryStylesSource).toMatch(/\.logMode\s*\{[^}]*display:\s*inline-flex/s);
    expect(queryStylesSource).not.toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*\border\s*:/s);
    expect(historyStylesSource).toMatch(
      /\.logRegion\[data-explore-log-region='result'\]\s*\{[^}]*min-height:\s*0[^}]*flex:\s*1[^}]*overflow:\s*hidden/s
    );
  });

  it('keeps optional log dimensions and conditions available in a flat disclosure', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <QuerySubject />
      </I18nextProvider>
    );
    expect(screen.getByLabelText('Service name')).toBeInTheDocument();
    expect(screen.getByLabelText('Service namespace')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Attribute conditions' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Attribute conditions' })?.closest('details')).not.toBeNull();
    expect(screen.queryByText('Advanced filters')).not.toBeInTheDocument();
    expect(screen.queryByText('Add filters')).not.toBeInTheDocument();
    expect(logQueryBuilderStylesSource).toMatch(/min-height:\s*32px/);
    expect(logQueryBuilderStylesSource).toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*min-height:\s*36px/);
    expect(logQueryBuilderStylesSource).toMatch(
      /@media\s*\(max-width:\s*1100px\)[\s\S]*\.conditionField\s*>\s*span\s*\{[^}]*display:\s*block/s
    );
    expect(queryStylesSource).toMatch(/@media\s*\(max-width:\s*1000px\)[\s\S]*\.logCommandFields\s*\{[^}]*repeat\(2,/s);
    expect(queryStylesSource).toMatch(
      /@media\s*\(max-width:\s*360px\)[\s\S]*\.logCommandFields\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s
    );
    expect(logQueryBuilderStylesSource).toMatch(/\.scopeGrid\s*\{[^}]*repeat\(3,/s);
    expect(logQueryBuilderStylesSource).toMatch(
      /@media\s*\(max-width:\s*520px\)[\s\S]*\.scopeGrid\s*\{[^}]*repeat\(2,/s
    );
    expect(logQueryBuilderStylesSource).not.toMatch(/border-radius|box-shadow|background(?:-color)?\s*:/);
  });

  it('edits optional QueryContext v1 dimensions as an instance and HTTP route template', () => {
    const query = {
      signal: 'metrics',
      timeRange: 'last-30m',
      instance: 'checkout-7d9',
      endpoint: '/checkout'
    } as const;
    render(
      <I18nextProvider i18n={i18n}>
        <QueryBarWithEditor
          query={query}
          t={i18n.t}
          updateQuery={vi.fn()}
          updateScope={vi.fn()}
          refresh={vi.fn().mockResolvedValue(undefined)}
          time={sharedTime()}
          submission={{
            draft: draftFromQuery(query),
            errors: {},
            updateField: vi.fn(),
            submit: vi.fn(),
            removeFilter: vi.fn(),
            removeFilters: vi.fn(),
            applyLogPatch: vi.fn(),
            resetDraft: vi.fn()
          }}
        />
      </I18nextProvider>
    );

    expect(screen.getByPlaceholderText('Service instance ID')).toHaveValue('checkout-7d9');
    expect(screen.getByPlaceholderText('HTTP route template, for example /checkout')).toHaveValue('/checkout');
    expect(screen.getByText('Instance: checkout-7d9')).toBeInTheDocument();
    expect(screen.getByText('HTTP route: /checkout')).toBeInTheDocument();
  });

  it('delegates refresh without rewriting a scoped fixed window and exposes invalid handoffs', () => {
    const updateQuery = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench
          query={{
            signal: 'metrics',
            timeRange: 'last-30m',
            serviceName: 'checkout-api',
            serviceNamespace: 'commerce',
            environment: 'prod',
            collectorId: 'collector-east',
            start: 1_710_000_000_000,
            end: 1_710_000_005_000
          }}
          t={i18n.t}
          updateQuery={updateQuery}
          timeToolbar={
            <ExploreSignalTimeToolbar
              query={{ signal: 'metrics', timeRange: 'last-30m', start: 1_710_000_000_000, end: 1_710_000_005_000 }}
              t={i18n.t}
              updateScope={updateQuery}
              time={null}
              refresh={refresh}
            />
          }
        />
        <QueryBarWithEditor
          query={{
            signal: 'metrics',
            timeRange: 'last-30m',
            serviceName: 'checkout-api',
            serviceNamespace: 'commerce',
            environment: 'prod',
            collectorId: 'collector-east',
            start: 1_710_000_000_000,
            end: 1_710_000_005_000
          }}
          t={i18n.t}
          updateQuery={vi.fn()}
          updateScope={updateQuery}
          refresh={refresh}
          time={sharedTime({ autoRefreshMs: 0 })}
          submission={{
            draft: draftFromQuery({
              signal: 'metrics',
              timeRange: 'last-30m',
              start: 1_710_000_000_000,
              end: 1_710_000_005_000
            }),
            errors: {},
            updateField: vi.fn(),
            submit: vi.fn(),
            removeFilter: vi.fn(),
            removeFilters: vi.fn(),
            applyLogPatch: vi.fn(),
            resetDraft: vi.fn()
          }}
        />
      </I18nextProvider>
    );

    expect(screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Time range' })[0]?.value).toMatch(/^2024-/u);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(updateQuery).not.toHaveBeenCalled();
    cleanup();
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreWorkbench
          query={{ signal: 'metrics', timeRange: 'last-30m', collectorId: 'collector-east', start: 2_000, end: 1_000 }}
          t={i18n.t}
          updateQuery={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.getByText(en.explore.handoffInvalid)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Auto refresh/u })).not.toBeInTheDocument();
  });
});

function WorkbenchSubject({
  updateQuery,
  time = sharedTime()
}: {
  updateQuery: (changes: ExploreQueryPatch) => void;
  time?: SharedTimeValue;
}) {
  const { t } = useTranslation();
  return (
    <>
      <ExploreWorkbench
        query={{ signal: 'metrics', timeRange: 'last-30m', query: 'http_requests_total' }}
        t={t}
        updateQuery={updateQuery}
      />
      <QuerySubject
        query={{ signal: 'metrics', timeRange: 'last-30m', query: 'http_requests_total' }}
        time={time}
        updateScope={updateQuery}
        refresh={vi.fn().mockResolvedValue(undefined)}
      />
    </>
  );
}

function sharedTime(override: Partial<SharedTimeValue> = {}): SharedTimeValue {
  return {
    policy: 'route_owned',
    headerMode: 'exact_window',
    manualRefreshOwner: 'time_revision',
    window: { from: 1_000, to: 2_000 },
    range: '30m',
    autoRefreshMs: 0,
    remainingMs: null,
    refreshRevision: 0,
    setRange: vi.fn(),
    setAutoRefresh: vi.fn(),
    commitWindow: vi.fn(),
    requestRefresh: vi.fn(),
    ...override
  };
}

function QuerySubject({
  query = { signal: 'logs', timeRange: 'last-30m' },
  time = sharedTime(),
  updateScope = vi.fn(),
  refresh = vi.fn().mockResolvedValue(undefined)
}: {
  query?: Parameters<typeof draftFromQuery>[0];
  time?: SharedTimeValue;
  updateScope?: (changes: ExploreQueryPatch) => void;
  refresh?: () => Promise<void>;
} = {}) {
  const { t } = useTranslation();
  return (
    <>
      <ExploreSignalTimeToolbar
        query={query}
        t={t}
        updateScope={updateScope}
        time={time}
        refresh={refresh}
        capability={query.signal === 'logs' ? (query.live ? 'log_stream' : 'log_history') : 'polling'}
      />
      <QueryBarWithEditor
        query={query}
        t={t}
        updateQuery={vi.fn()}
        updateScope={updateScope}
        refresh={refresh}
        time={null}
        submission={{
          draft: draftFromQuery(query),
          errors: {},
          updateField: vi.fn(),
          submit: vi.fn(),
          removeFilter: vi.fn(),
          removeFilters: vi.fn(),
          applyLogPatch: vi.fn(),
          resetDraft: vi.fn()
        }}
      />
    </>
  );
}

function QueryBarWithEditor(props: Omit<Parameters<typeof ExploreQueryBar>[0], 'editor' | 'history'>) {
  const history = useRecentLogSearches();
  const editor = useLogQueryBuilder(props.submission);
  return <ExploreQueryBar {...props} history={history} editor={editor} />;
}
