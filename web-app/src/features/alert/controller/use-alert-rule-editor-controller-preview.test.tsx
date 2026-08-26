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

import { AlertRuleContractError, AlertRuleRequestFailure } from '../model/alert-rule-model';

import {
  api,
  deferred,
  persisted,
  previewEvidence,
  renderController,
  renderRouted,
  resetAlertRuleEditorFixture,
  session
} from './use-alert-rule-editor-controller-test-support';

describe('Alert Rule editor preview ownership', () => {
  beforeEach(resetAlertRuleEditorFixture);

  it('resets a local draft when route history changes', async () => {
    api.loadAlertRule.mockImplementation((id: number) => Promise.resolve({ ...persisted, id, name: `Rule ${id}` }));
    const routed = renderRouted(['/alerts/rules/7/edit', '/alerts/rules/8/edit']);
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 7'));
    act(() => routed.current().updateDraft({ name: 'local' }));
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 8'));
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 7'));
  });

  it.each([
    [previewEvidence(0), 'empty'],
    [previewEvidence(1), 'ready'],
    [new AlertRuleRequestFailure('permission', 'rejected'), 'permission'],
    [new AlertRuleRequestFailure('unavailable', 'uncertain'), 'unavailable'],
    [new AlertRuleContractError('bad'), 'invalid']
  ])('keeps preview evidence distinct as %s', async (evidence, kind) => {
    if (evidence instanceof Error) api.previewAlertRule.mockRejectedValue(evidence);
    else api.previewAlertRule.mockResolvedValue(evidence);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));
    await act(async () => result.current.preview());
    expect(result.current.state.preview.kind).toBe(kind);
  });

  it.each([
    [new AlertRuleRequestFailure('permission', 'rejected'), 'permission'],
    [new AlertRuleContractError('over-limit preview'), 'invalid']
  ])('retires preview rows when the next preview becomes %s', async (failure, kind) => {
    api.previewAlertRule.mockResolvedValueOnce(previewEvidence(1)).mockRejectedValueOnce(failure);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));
    await act(async () => result.current.preview());
    expect(result.current.state.preview.kind).toBe('ready');

    await act(async () => result.current.preview());

    expect(result.current.state.preview).toEqual({ kind });
    expect(JSON.stringify(result.current.state.preview)).not.toContain('"rows"');
  });

  it('rejects an over-limit preview expression as input before API transport', async () => {
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'x'.repeat(2049) }));

    await act(async () => result.current.preview());

    expect(result.current.state.preview).toEqual({ kind: 'input' });
    expect(api.previewAlertRule).not.toHaveBeenCalled();
  });

  it('keeps only the latest same-route preview when completions arrive out of order', async () => {
    const first = deferred<ReturnType<typeof previewEvidence>>();
    const second = deferred<ReturnType<typeof previewEvidence>>();
    api.previewAlertRule.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));

    let firstPreview!: Promise<void>;
    let secondPreview!: Promise<void>;
    act(() => {
      firstPreview = result.current.preview();
      secondPreview = result.current.preview();
    });
    act(() => second.resolve(previewEvidence(2)));
    await act(async () => secondPreview);
    expect(result.current.state.preview).toEqual({ kind: 'ready', ...previewEvidence(2) });

    act(() => first.resolve(previewEvidence(1)));
    await act(async () => firstPreview);
    expect(result.current.state.preview).toEqual({ kind: 'ready', ...previewEvidence(2) });
  });

  it('does not let a stale preview completion replace current editor state', async () => {
    const preview = deferred<ReturnType<typeof previewEvidence>>();
    api.previewAlertRule.mockReturnValue(preview.promise);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.preview();
    });

    act(() => result.current.updateDraft({ expr: 'usage > 95' }));
    act(() => preview.resolve(previewEvidence(1)));
    await act(async () => pending);

    expect(result.current.state.draft?.expr).toBe('usage > 95');
    expect(result.current.state.preview.kind).toBe('idle');
  });

  it('retires preview rows and blocks preview transport when write access is lost', async () => {
    const view = renderController('new', '/alerts/rules/new');
    act(() => view.result.current.updateDraft({ expr: 'usage > 90' }));
    api.previewAlertRule.mockResolvedValue(previewEvidence(1));
    await act(async () => view.result.current.preview());
    expect(view.result.current.state.preview.kind).toBe('ready');

    session.roles = ['GUEST'];
    view.rerender();
    await waitFor(() => expect(view.result.current.state.preview.kind).toBe('idle'));
    await act(async () => view.result.current.preview());

    expect(api.previewAlertRule).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(view.result.current.state)).not.toContain('"rows"');
  });
});
