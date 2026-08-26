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

import type { AlertRule } from '../model/alert-rule-model';

import {
  api,
  deferred,
  notify,
  persisted,
  previewEvidence,
  renderRouted,
  resetAlertRuleEditorFixture,
  validDraft
} from './use-alert-rule-editor-controller-test-support';

describe('Alert Rule editor route retirement', () => {
  beforeEach(resetAlertRuleEditorFixture);

  it('cancel only navigates and performs no writes', () => {
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().cancel());
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
    expect(api.saveAlertRule).not.toHaveBeenCalled();
  });

  it('does not let stale detail overwrite the next route draft', async () => {
    const oldDetail = deferred<AlertRule>();
    api.loadAlertRule
      .mockReturnValueOnce(oldDetail.promise)
      .mockResolvedValueOnce({ ...persisted, id: 8, name: 'Rule 8' });
    const routed = renderRouted(['/alerts/rules/7/edit', '/alerts/rules/8/edit']);
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 8'));
    act(() => oldDetail.resolve({ ...persisted, name: 'Rule 7' }));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 8'));
  });

  it('does not let stale preview overwrite a new route', async () => {
    const oldPreview = deferred<ReturnType<typeof previewEvidence>>();
    api.previewAlertRule.mockReturnValue(oldPreview.promise);
    api.loadAlertRule.mockImplementation((id: number) => Promise.resolve({ ...persisted, id }));
    const routed = renderRouted(['/alerts/rules/new', '/alerts/rules/8/edit']);
    act(() => routed.current().updateDraft({ expr: 'usage > 90' }));
    let preview!: Promise<void>;
    act(() => {
      preview = routed.current().preview();
    });
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().state.draft?.id).toBe(8));
    act(() => oldPreview.resolve(previewEvidence(1)));
    await act(async () => preview);
    expect(routed.current().state.preview.kind).toBe('idle');
  });

  it('does not let a stale save prove success or navigate away from the new route', async () => {
    const oldSave = deferred<void>();
    api.saveAlertRule.mockReturnValue(oldSave.promise);
    const routed = renderRouted(['/alerts/rules/new', '/alerts/rules/8/edit']);
    act(() => routed.current().updateDraft(validDraft()));
    let save!: Promise<void>;
    act(() => {
      save = routed.current().save();
    });
    await waitFor(() => expect(api.saveAlertRule).toHaveBeenCalled());
    await act(async () => routed.router.navigate(1));
    act(() => oldSave.resolve());
    await act(async () => save);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules/8/edit');
    expect(api.loadAlertRules).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
    expect(routed.current().state.command).toBe('idle');
  });

  it('invalidates a stale save when its route component unmounts', async () => {
    const oldSave = deferred<void>();
    api.saveAlertRule.mockReturnValue(oldSave.promise);
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().updateDraft(validDraft()));
    let save!: Promise<void>;
    act(() => {
      save = routed.current().save();
    });
    await waitFor(() => expect(api.saveAlertRule).toHaveBeenCalled());
    await act(async () => routed.router.navigate('/alerts/rules'));
    act(() => oldSave.resolve());
    await act(async () => save);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
    expect(api.loadAlertRules).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
  });
});
