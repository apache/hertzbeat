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
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AlertRuleContractError,
  AlertRuleRequestFailure,
  AlertRuleWriteRequestFailure,
  type AlertRuleQuery
} from '../model/alert-rule-model';

import {
  api,
  deferred,
  notify,
  page,
  persisted,
  renderController,
  renderRouted,
  resetAlertRuleEditorFixture,
  session,
  validDraft
} from './use-alert-rule-editor-controller-test-support';

describe('Alert Rule editor save proof', () => {
  beforeEach(resetAlertRuleEditorFixture);

  it('keeps an in-flight save owned and unlocks it after write access is lost and restored', async () => {
    const write = deferred<void>();
    api.saveAlertRule.mockReturnValue(write.promise);
    const view = renderController('edit');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.save();
    });
    await waitFor(() => expect(view.result.current.state.command).toBe('saving'));

    session.roles = ['GUEST'];
    view.rerender();
    session.roles = ['ADMIN'];
    view.rerender();
    act(() => write.resolve());
    await act(async () => save);

    expect(view.result.current.state.command).toBe('idle');
    expect(notify.success).toHaveBeenCalledWith('alertRules.saveSuccess');
  });

  it('retains proof recovery across write-access loss and retries it after access returns', async () => {
    const view = renderController('edit');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleRequestFailure('unavailable', 'uncertain'));
    await act(async () => view.result.current.save());
    expect(view.result.current.state.recovery).toEqual({
      phase: 'proof',
      failure: 'unavailable',
      retryable: true
    });

    session.roles = ['GUEST'];
    view.rerender();
    session.roles = ['ADMIN'];
    view.rerender();
    await act(async () => view.result.current.retrySave());

    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
    expect(notify.success).toHaveBeenCalledWith('alertRules.saveSuccess');
    expect(view.result.current.state.recovery).toBeUndefined();
  });

  it('saves PUT only after exact-id all-field canonical convergence', async () => {
    const routed = renderRouted(['/alerts/rules/7/edit']);
    await waitFor(() => expect(routed.current().state.detail.kind).toBe('ready'));
    api.loadAlertRule.mockResolvedValue({ ...persisted, labels: { severity: 'critical' } });
    await act(async () => routed.current().save());
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
    expect(notify.success).toHaveBeenCalled();

    const second = renderController('edit');
    await waitFor(() => expect(second.result.current.state.detail.kind).toBe('ready'));
    api.loadAlertRule.mockResolvedValue({ ...persisted, annotations: {} });
    await act(async () => second.result.current.save());
    expect(second.result.current.state.draft).not.toBeNull();
    expect(notify.error).toHaveBeenCalledWith('common.routeError.description');
  });

  it('proves POST by traversing pages for one exact normalized name and convergence', async () => {
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().updateDraft(validDraft()));
    api.loadAlertRules
      .mockImplementationOnce((query: AlertRuleQuery) => Promise.resolve(page(query, [])))
      .mockImplementationOnce((query: AlertRuleQuery) =>
        Promise.resolve({ ...page(query, []), totalElements: 26, totalPages: 2 })
      )
      .mockImplementationOnce((query: AlertRuleQuery) =>
        Promise.resolve({
          ...page(query, [
            {
              ...persisted,
              id: 9,
              name: 'New Rule',
              expr: 'usage > 90',
              period: 300,
              times: 3,
              labels: {},
              annotations: {},
              template: 'Alert'
            }
          ]),
          totalElements: 26,
          totalPages: 2
        })
      );
    await act(async () => routed.current().save());
    expect(api.loadAlertRules).toHaveBeenCalledTimes(3);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
  });

  it('retains an uncertain create receipt and retries only canonical reads', async () => {
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft(validDraft()));
    api.loadAlertRules
      .mockImplementationOnce((query: AlertRuleQuery) => Promise.resolve(page(query, [])))
      .mockImplementationOnce((query: AlertRuleQuery) =>
        Promise.resolve(
          page(query, [
            {
              ...persisted,
              id: 9,
              name: 'New Rule',
              expr: 'usage > 90',
              period: 300,
              times: 3,
              labels: {},
              annotations: {},
              template: 'Alert'
            }
          ])
        )
      );
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleRequestFailure('unavailable', 'uncertain'));

    await act(async () => result.current.save());
    expect(result.current.state.recovery).toEqual({ phase: 'proof', failure: 'unavailable', retryable: true });
    await act(async () => result.current.save());
    await waitFor(() => expect(api.saveAlertRule).toHaveBeenCalledTimes(1));

    await act(async () => result.current.retrySave());
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
    expect(api.loadAlertRules).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith('alertRules.saveSuccess');
  });

  it('retains an uncertain update receipt and retries only its exact-id proof', async () => {
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleRequestFailure('unavailable', 'uncertain'));

    await act(async () => result.current.save());
    expect(result.current.state.recovery).toEqual({ phase: 'proof', failure: 'unavailable', retryable: true });
    await act(async () => result.current.save());
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retrySave());
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
    expect(api.loadAlertRule).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith('alertRules.saveSuccess');
  });

  it('retries only proof after an acknowledged update proof read fails', async () => {
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    api.loadAlertRule.mockRejectedValueOnce(new AlertRuleRequestFailure('unavailable', 'uncertain'));

    await act(async () => result.current.save());
    expect(result.current.state.recovery).toEqual({ phase: 'proof', failure: 'unavailable', retryable: true });
    await act(async () => result.current.retrySave());

    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
    expect(api.loadAlertRule).toHaveBeenCalledTimes(3);
    expect(notify.success).toHaveBeenCalledWith('alertRules.saveSuccess');
  });

  it('unlocks the editor only after a definite source rejection', async () => {
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleRequestFailure('error', 'rejected'));

    await act(async () => result.current.save());
    expect(result.current.state.recovery).toBeUndefined();
    act(() => result.current.updateDraft({ name: 'CPU updated' }));
    expect(result.current.state.draft?.name).toBe('CPU updated');

    api.loadAlertRule.mockResolvedValueOnce({ ...persisted, name: 'CPU updated' });
    await act(async () => result.current.save());
    expect(api.saveAlertRule).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith('alertRules.saveSuccess');
  });

  it('retains the draft and exposes redacted server validation without proof recovery', async () => {
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleWriteRequestFailure('validation', 'rejected'));

    await act(async () => result.current.save());

    expect(result.current.state.saveFailure).toBe('validation');
    expect(result.current.state.recovery).toBeUndefined();
    expect(result.current.state.draft).toEqual(expect.objectContaining({ id: persisted.id, name: persisted.name }));
    expect(notify.warning).toHaveBeenCalledWith('alertRules.validation');
    expect(api.loadAlertRule).toHaveBeenCalledTimes(1);
  });

  it('retains the draft and exposes redacted server permission without proof recovery', async () => {
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleRequestFailure('permission', 'rejected'));

    await act(async () => result.current.save());

    expect(result.current.state.saveFailure).toBe('permission');
    expect(result.current.state.recovery).toBeUndefined();
    expect(notify.error).toHaveBeenCalledWith('common.permission.roleRequiredDescription');
    expect(api.loadAlertRule).toHaveBeenCalledTimes(1);
  });

  it('does not treat an unscoped contract exception as source rejection evidence', async () => {
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    api.saveAlertRule.mockRejectedValueOnce(new AlertRuleContractError('write outcome is not known'));

    await act(async () => result.current.save());

    expect(result.current.state.recovery).toEqual({ phase: 'proof', failure: 'error', retryable: true });
    await act(async () => result.current.save());
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
  });

  it('captures create baseline before POST and does not accept a pre-existing same-name rule', async () => {
    const existing = {
      ...persisted,
      name: 'New Rule',
      expr: 'usage > 90',
      period: 300,
      times: 3,
      labels: {},
      annotations: {},
      template: 'Alert'
    };
    const order: string[] = [];
    api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => {
      order.push('read');
      return Promise.resolve(page(query, [existing]));
    });
    api.saveAlertRule.mockImplementation(() => {
      order.push('write');
      return Promise.resolve();
    });
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft(validDraft()));

    await act(async () => result.current.save());

    expect(order).toEqual(['read', 'write', 'read']);
    expect(result.current.state.recovery).toEqual({
      phase: 'commit-uncertain',
      failure: 'unavailable',
      retryable: false
    });
    expect(notify.success).not.toHaveBeenCalled();
    await act(async () => result.current.retrySave());
    await act(async () => result.current.save());
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
    expect(api.loadAlertRules).toHaveBeenCalledTimes(2);
  });

  it('admits only one same-tick save write', async () => {
    const write = deferred<void>();
    api.saveAlertRule.mockReturnValue(write.promise);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft(validDraft()));

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.save();
      second = result.current.save();
    });
    await waitFor(() => expect(api.saveAlertRule).toHaveBeenCalledTimes(1));

    act(() => write.resolve());
    await act(async () => Promise.all([first, second]));
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['non-finite', Number.NaN],
    ['over-limit', 1_000_000]
  ])('rejects %s create-proof page counts without starting an unbounded scan', async (_label, totalPages) => {
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().updateDraft(validDraft()));
    const matching = {
      ...persisted,
      id: 9,
      name: 'New Rule',
      expr: 'usage > 90',
      period: 300,
      times: 3,
      labels: {},
      annotations: {},
      template: 'Alert'
    };
    api.loadAlertRules
      .mockResolvedValueOnce({
        ...page({ search: 'New Rule', pageIndex: 0, pageSize: 25 }, [matching]),
        totalElements: 25_000_000,
        totalPages
      })
      .mockRejectedValueOnce(new Error('proof scan escaped its first page'));

    await act(async () => routed.current().save());

    expect(api.loadAlertRules).toHaveBeenCalledTimes(1);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules/new');
    expect(routed.current().state.saveFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps create draft when canonical name is missing, duplicate, or drifting', async () => {
    for (const records of [
      [],
      [
        { ...persisted, name: 'New Rule' },
        { ...persisted, id: 8, name: 'New Rule' }
      ],
      [{ ...persisted, name: 'New Rule', annotations: { drift: 'yes' } }]
    ]) {
      vi.clearAllMocks();
      api.saveAlertRule.mockResolvedValue(undefined);
      api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve(page(query, records)));
      const { result } = renderController('new', '/alerts/rules/new');
      act(() => result.current.updateDraft(validDraft()));
      await act(async () => result.current.save());
      expect(result.current.state.draft).not.toBeNull();
      expect(notify.success).not.toHaveBeenCalled();
    }
  });
});
