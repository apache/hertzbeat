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

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { MonitorDetailView } from './monitor-detail-view';

const ready = {
  kind: 'ready' as const,
  detail: {
    monitor: { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1, intervals: 0 },
    params: [],
    collector: null,
    grafanaDashboard: null,
    metrics: [{ name: 'summary', favorited: false }]
  }
};

describe('MonitorDetailView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('renders loading as status evidence', () => {
    renderView({ kind: 'loading' });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each([
    ['missing', 'common.notFound.description'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ] as const)('renders distinct %s evidence', (kind, key) => {
    renderView({ kind });
    expect(screen.getByText(i18n.t(key))).toBeInTheDocument();
    expect(screen.queryByText('checkout')).not.toBeInTheDocument();
  });

  it('renders strict ready evidence and passes embedded metrics through', () => {
    renderView(ready);
    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByTestId('metrics')).toHaveTextContent('1');
  });

  it('keeps the monitor help guide available from detail', () => {
    renderView(ready);

    expect(screen.getByRole('link', { name: i18n.t('monitor.help') })).toHaveAttribute(
      'href',
      'https://hertzbeat.apache.org/docs/help/guide/'
    );
  });

  it.each([
    null,
    grafana(false, 'https://grafana.example/d/ops'),
    grafana(true, ''),
    grafana(true, '/d/ops'),
    grafana(true, 'javascript:alert(1)'),
    grafana(true, 'data:text/html,unsafe')
  ])('does not render a dashboard for missing, disabled, or unsafe evidence', grafanaDashboard => {
    renderView({ ...ready, detail: { ...ready.detail, grafanaDashboard } });

    expect(screen.queryByTitle(i18n.t('monitor.grafana.title'))).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: i18n.t('monitor.grafana.title') })).not.toBeInTheDocument();
  });

  it('renders an enabled dashboard with a safe absolute URL', () => {
    renderView({
      ...ready,
      detail: { ...ready.detail, grafanaDashboard: grafana(true, 'https://grafana.example/d/ops?orgId=1') }
    });

    expect(screen.getByTitle(i18n.t('monitor.grafana.title'))).toHaveAttribute(
      'src',
      'https://grafana.example/d/ops?orgId=1'
    );
  });
});

function grafana(enabled: boolean, url: string | null) {
  return {
    monitorId: 7,
    folderUid: null,
    slug: null,
    status: null,
    uid: null,
    url,
    version: null,
    enabled,
    template: null
  };
}

function renderView(detail: Parameters<typeof MonitorDetailView>[0]['state']['detail']) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MonitorDetailView
        state={{ detail, returnTo: '/monitors' }}
        actions={{ back: vi.fn(), edit: vi.fn() }}
        metricWorkbench={
          detail.kind === 'ready' ? (
            <output data-testid="metrics">{detail.detail.metrics?.length ?? 0}</output>
          ) : undefined
        }
      />
    </I18nextProvider>
  );
}
