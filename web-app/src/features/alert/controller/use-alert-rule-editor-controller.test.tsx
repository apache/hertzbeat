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

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  AlertRuleContractError,
  AlertRuleMissingError,
  AlertRuleRequestFailure,
  periodicLogStarterExpression
} from '../model/alert-rule-model';

import {
  api,
  monitor,
  persisted,
  renderController,
  resetAlertRuleEditorFixture,
  session,
  validDraft
} from './use-alert-rule-editor-controller-test-support';

describe('Alert Rule editor admission and datasource', () => {
  beforeEach(resetAlertRuleEditorFixture);

  it('forwards TanStack cancellation and aborts the detail read on unmount', async () => {
    let detailSignal: AbortSignal | undefined;
    api.loadAlertRule.mockImplementation((_id: number, signal: AbortSignal) => {
      detailSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    });
    const { unmount } = renderController('edit');
    await waitFor(() => expect(detailSignal).toBeInstanceOf(AbortSignal));

    unmount();

    expect(detailSignal?.aborted).toBe(true);
  });

  it('fails closed before create or edit write transport for a guest session', async () => {
    session.roles = ['GUEST'];
    const create = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(create.result.current.state.detail.kind).toBe('ready'));
    act(() => create.result.current.updateDraft(validDraft()));
    await act(async () => create.result.current.save());
    create.unmount();

    const edit = renderController('edit');
    await waitFor(() => expect(edit.result.current.state.detail.kind).toBe('ready'));
    await act(async () => edit.result.current.save());

    expect(api.saveAlertRule).not.toHaveBeenCalled();
  });

  it('aborts the datasource capability read when the editor unmounts', async () => {
    let datasourceSignal: AbortSignal | undefined;
    api.loadAlertRuleDatasourceStatus.mockImplementation((signal: AbortSignal) => {
      datasourceSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    });
    const { unmount } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(datasourceSignal).toBeInstanceOf(AbortSignal));

    unmount();

    expect(datasourceSignal?.aborted).toBe(true);
  });

  it('exposes metric target evidence only while realtime metric authoring owns the editor', async () => {
    const { result } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(result.current.state.metricTarget.apps.kind).toBe('ready'));

    expect(result.current.state.metricTarget.hierarchy).toEqual({ kind: 'idle' });
    act(() => result.current.changeDataType('log'));

    expect(result.current.state.metricTarget.apps).toEqual({ kind: 'idle' });
    expect(monitor.loadMonitorNavigationApps).toHaveBeenCalledTimes(1);
  });

  it('accepts only loaded applications and targets from the current hierarchy', async () => {
    monitor.loadMonitorNavigationApps.mockResolvedValue([
      { category: 'application', value: 'springboot3', label: 'Spring Boot 3', hide: false }
    ]);
    monitor.loadMonitorAppHierarchy.mockResolvedValue({
      category: 'application',
      value: 'springboot3',
      label: 'Spring Boot 3',
      isLeaf: false,
      hide: false,
      type: null,
      unit: null,
      children: [
        {
          category: null,
          value: 'summary',
          label: 'Summary',
          isLeaf: false,
          hide: false,
          type: null,
          unit: null,
          children: []
        }
      ]
    });
    const { result } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(result.current.state.metricTarget.apps.kind).toBe('ready'));

    act(() => result.current.changeMetricApplication('missing'));
    expect(result.current.state.draft?.metricEditor).toMatchObject({ kind: 'targeted', app: '' });

    act(() => result.current.changeMetricApplication('springboot3'));
    await waitFor(() => expect(result.current.state.metricTarget.hierarchy.kind).toBe('ready'));
    expect(result.current.state.draft?.metricEditor).toMatchObject({
      kind: 'targeted',
      app: 'springboot3',
      target: null
    });

    act(() => result.current.changeMetricTarget({ kind: 'metric', app: 'springboot3', metric: 'missing' }));
    expect(result.current.state.draft?.metricEditor).toMatchObject({ target: null });

    act(() => result.current.changeMetricTarget({ kind: 'availability', app: 'springboot3' }));
    expect(result.current.state.draft).toMatchObject({
      expr: 'equals(__app__,"springboot3") && equals(__available__,"down")',
      metricEditor: { target: { kind: 'availability', app: 'springboot3' } }
    });
  });

  it('owns structured and expert metric thresholds through the selected field catalog', async () => {
    monitor.loadMonitorNavigationApps.mockResolvedValue([
      { category: 'application', value: 'springboot3', label: 'Spring Boot 3', hide: false }
    ]);
    monitor.loadMonitorAppHierarchy.mockResolvedValue({
      category: 'application',
      value: 'springboot3',
      label: 'Spring Boot 3',
      isLeaf: false,
      hide: false,
      type: null,
      unit: null,
      children: [
        {
          category: null,
          value: 'summary',
          label: 'Summary',
          isLeaf: false,
          hide: false,
          type: null,
          unit: null,
          children: []
        }
      ]
    });
    const { result } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(result.current.state.metricTarget.apps.kind).toBe('ready'));
    act(() => result.current.changeMetricApplication('springboot3'));
    await waitFor(() => expect(result.current.state.metricTarget.hierarchy.kind).toBe('ready'));
    act(() => result.current.changeMetricTarget({ kind: 'metric', app: 'springboot3', metric: 'summary' }));

    act(() =>
      result.current.changeMetricStructuredCondition({
        kind: 'group',
        join: 'and',
        items: [{ kind: 'condition', field: '__row__', operator: '>', value: 1 }]
      })
    );
    expect(result.current.state.draft).toMatchObject({
      expr: 'equals(__app__,"springboot3") && equals(__metrics__,"summary") && __row__ > 1',
      metricEditor: { authoring: { mode: 'structured' } }
    });

    act(() => result.current.changeMetricAuthoringMode('expert'));
    expect(result.current.state.draft?.metricEditor).toMatchObject({
      authoring: { mode: 'expert', condition: '__row__ > 1' }
    });
    act(() => result.current.changeMetricExpertCondition('__row__ > 2'));
    expect(result.current.state.draft?.expr).toContain('__row__ > 2');
    act(() => result.current.changeMetricAuthoringMode('structured'));
    expect(result.current.state.draft?.metricEditor).toMatchObject({
      authoring: { mode: 'structured', condition: { items: [{ value: 2 }] } }
    });
  });

  it.each([' 7', '1e2', '+1', '0'])('rejects invalid route id %s without a request', async ruleId => {
    const { result } = renderController('edit', `/alerts/rules/${encodeURIComponent(ruleId)}/edit`);
    await waitFor(() => expect(result.current.state.detail.kind).toBe('error'));
    await act(async () => result.current.retryDetail());
    expect(api.loadAlertRule).not.toHaveBeenCalled();
  });

  it.each([
    [new AlertRuleMissingError(), 'missing'],
    [new AlertRuleRequestFailure('unavailable', 'uncertain'), 'unavailable'],
    [new AlertRuleContractError('bad'), 'error']
  ])('keeps detail failure %s distinct and retryable', async (reason, kind) => {
    api.loadAlertRule.mockRejectedValueOnce(reason).mockResolvedValueOnce(persisted);
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe(kind));
    await act(async () => result.current.retryDetail());
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    expect(result.current.state.draft).toMatchObject({ id: 7, name: 'CPU' });
  });

  it('disables periodic authoring when no periodic executor is available', async () => {
    api.loadAlertRuleDatasourceStatus.mockResolvedValue({
      hasPromqlExecutor: false,
      hasSqlExecutor: false
    });
    const { result } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(result.current.state.datasource.kind).toBe('ready'));

    act(() => result.current.changeKind('periodic'));

    expect(result.current.state.draft).toMatchObject({ kind: 'realtime', dataType: 'metric' });
  });

  it('selects and preserves only periodic signals supported by the current executors', async () => {
    api.loadAlertRuleDatasourceStatus.mockResolvedValue({
      hasPromqlExecutor: false,
      hasSqlExecutor: true
    });
    const { result } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(result.current.state.datasource.kind).toBe('ready'));

    act(() => result.current.changeKind('periodic'));
    expect(result.current.state.draft).toMatchObject({
      kind: 'periodic',
      dataType: 'log',
      expr: periodicLogStarterExpression
    });

    act(() => result.current.updateDraft({ expr: 'SELECT count(*) FROM custom_logs' }));
    act(() => result.current.changeDataType('metric'));
    expect(result.current.state.draft?.dataType).toBe('log');
    act(() => result.current.changeDataType('trace'));
    expect(result.current.state.draft).toMatchObject({ dataType: 'trace', expr: '' });
  });

  it('keeps datasource read failure distinct and retries only that read', async () => {
    api.loadAlertRuleDatasourceStatus
      .mockRejectedValueOnce(new AlertRuleRequestFailure('unavailable', 'uncertain'))
      .mockResolvedValueOnce({ hasPromqlExecutor: true, hasSqlExecutor: false });
    const { result } = renderController('new', '/alerts/rules/new');
    await waitFor(() => expect(result.current.state.datasource.kind).toBe('unavailable'));

    await act(async () => result.current.retryDatasource());

    await waitFor(() => expect(result.current.state.datasource.kind).toBe('ready'));
    expect(api.loadAlertRuleDatasourceStatus).toHaveBeenCalledTimes(2);
  });

  it('does not rewrite a persisted periodic strategy when its executor is currently unavailable', async () => {
    api.loadAlertRuleDatasourceStatus.mockResolvedValue({
      hasPromqlExecutor: false,
      hasSqlExecutor: false
    });
    api.loadAlertRule.mockResolvedValue({
      ...persisted,
      type: 'periodic_metric',
      datasource: 'promql'
    });
    const { result } = renderController('edit');

    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    await waitFor(() => expect(result.current.state.datasource.kind).toBe('ready'));

    expect(result.current.state.draft).toMatchObject({ kind: 'periodic', dataType: 'metric' });
  });
});
