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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertInhibitPage } from './alert-inhibit-page';

const controller = vi.hoisted(() => ({
  changePage: vi.fn(), closeDraft: vi.fn(), create: vi.fn(), edit: vi.fn(), refresh: vi.fn(), remove: vi.fn(),
  retryDetail: vi.fn(), setSearch: vi.fn(), state: {}, submit: vi.fn(), submitSearch: vi.fn(), toggle: vi.fn(), updateDraft: vi.fn()
}));
vi.mock('./controller/use-alert-inhibit-controller', () => ({ useAlertInhibitController: () => controller }));
vi.mock('./alert-management-nav', () => ({ AlertManagementNav: () => <nav /> }));
vi.mock('./alert-noise-control-nav', () => ({ AlertNoiseControlNav: () => <nav /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const record = { id: 7, name: 'Policy', sourceLabels: { severity: 'critical' }, targetLabels: { severity: 'warning' },
  equalLabels: ['service'], enable: true, gmtUpdate: '2026-07-17T09:00:00' };

describe('AlertInhibitPage', () => {
  beforeEach(() => { vi.clearAllMocks(); controller.state = buildState(); });
  afterEach(cleanup);

  it('renders server LocalDateTime verbatim without browser parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertInhibitPage />);
    expect(screen.getByText('2026-07-17T09:00:00')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
  });

  it.each([['empty', 'alertInhibits.empty'], ['unavailable', 'common.unavailable'], ['error', 'common.routeError.description']])('renders list state %s honestly', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertInhibitPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it.each([['missing', 'common.notFound.description'], ['unavailable', 'common.unavailable'], ['error', 'alertInhibits.loadFailed']])('renders retryable detail state %s', (kind, evidence) => {
    controller.state = buildState({ detail: { kind, id: 7 } });
    render(<AlertInhibitPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryDetail).toHaveBeenCalled();
  });

  it('does not invent nullable labels, enabled state, or time', () => {
    controller.state = buildState({ list: { kind: 'ready', records: [{ ...record, sourceLabels: null, targetLabels: null, equalLabels: null, enable: null, gmtUpdate: null }], total: 1 } });
    render(<AlertInhibitPage />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('delegates search, refresh, create, and edit', () => {
    render(<AlertInhibitPage />);
    fireEvent.change(screen.getByPlaceholderText('alertInhibits.search'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertInhibits.new' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    expect(controller.setSearch).toHaveBeenCalledWith('prod');
    expect(controller.refresh).toHaveBeenCalled();
    expect(controller.create).toHaveBeenCalled();
    expect(controller.edit).toHaveBeenCalledWith(7);
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return { command: 'idle', detail: { kind: 'idle' }, draft: null, editorFailure: undefined,
    list: { kind: 'ready', records: [record], total: 1 }, query: { search: '', pageIndex: 0, pageSize: 8 },
    refreshing: false, search: '', ...override };
}
