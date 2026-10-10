/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { createAlertInvestigationPersesResults } from '../model/alert-investigation-perses-model';
import { alertInvestigationSnapshot, alertReadyRoute } from '../model/alert-investigation-test-fixtures';
import { AlertInvestigationPage } from './alert-investigation-page';

const controller = vi.hoisted(() => {
  const runtime: { refetch: () => Promise<void>; route: unknown; state: unknown } = {
    refetch: vi.fn(() => Promise.resolve()),
    route: undefined,
    state: {}
  };
  return runtime;
});

vi.mock('../controller/use-alert-investigation-controller', () => ({
  useAlertInvestigationController: (route: unknown) => {
    controller.route = route;
    return { state: controller.state, refetch: controller.refetch };
  }
}));
vi.mock('../components/alert-investigation-view', () => ({
  AlertInvestigationView: (props: {
    onBack: () => void;
    onOpenLog: (record: unknown) => void;
    onOpenTrace: (trace: unknown) => void;
  }) => (
    <div data-testid="ready-view">
      <button onClick={props.onBack}>back</button>
      <button onClick={() => props.onOpenLog(alertInvestigationSnapshot().logs.records[0])}>log</button>
      <button onClick={() => props.onOpenTrace(alertInvestigationSnapshot().traces.traces[0])}>trace</button>
    </div>
  )
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function Location() {
  return <output data-testid="location">{useLocation().pathname + useLocation().search}</output>;
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/alerts/:alertId/investigate" element={<AlertInvestigationPage />} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AlertInvestigationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.state = { kind: 'invalid' };
  });
  afterEach(cleanup);

  it('fails closed for a partial exact window', () => {
    renderPage('/alerts/11/investigate?start=1000&timeZone=UTC');
    expect(controller.route).toEqual({ kind: 'invalid' });
    expect(screen.getByRole('alert')).toHaveTextContent('alertInvestigation.query.invalidRoute');
    expect(document.querySelector('[data-alert-investigation="true"]')).toBeInTheDocument();
  });

  it('announces loading for a valid exact route', () => {
    controller.state = { kind: 'loading', route: alertReadyRoute() };
    renderPage('/alerts/11/investigate?start=1000&end=2000&timeZone=UTC&returnTo=%2Falerts');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent('alertInvestigation.query.loading');
    expect(document.querySelector('[data-alert-investigation="true"]')).toBeInTheDocument();
  });

  it.each(['unavailable', 'contract_error'] as const)('keeps the responsive route marker for %s', kind => {
    controller.state = { kind, route: alertReadyRoute() };
    renderPage('/alerts/11/investigate?start=1000&end=2000&timeZone=UTC&returnTo=%2Falerts');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.querySelector('[data-alert-investigation="true"]')).toBeInTheDocument();
  });

  it('preserves the frozen scope when opening focused trace evidence', () => {
    const route = alertReadyRoute();
    const snapshot = alertInvestigationSnapshot();
    controller.state = {
      kind: 'ready',
      route,
      snapshot,
      perses: createAlertInvestigationPersesResults(snapshot)
    };
    renderPage('/alerts/11/investigate?start=1000&end=2000&timeZone=UTC&returnTo=%2Falerts');
    fireEvent.click(screen.getByRole('button', { name: 'trace' }));
    const location = screen.getByTestId('location').textContent ?? '';
    expect(location).toContain('/explore?');
    expect(location).toContain('traceId=0123456789abcdef0123456789abcdef');
    expect(location).toContain('start=1000');
    expect(location).toContain('end=2000');
    expect(location).toContain('timeZone=UTC');
  });
});
