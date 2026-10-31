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

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { AgentPermissionMode } from './agent-permission-mode';
import type { AgentPermissionControl } from '../model/agent-permission-mode';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
describe('permission review dialog', () => {
  it('keeps enable disabled until both review and explicit consent are satisfied', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);
    const control: AgentPermissionControl = {
      phase: 'ready',
      mode: 'MANUAL',
      fullAllowed: true,
      dialogOpen: true,
      busy: false,
      acknowledged: false,
      remainingSeconds: 5,
      challengeExpired: false,
      confirmAllowed: false,
      error: false,
      actions: {
        requestFull: vi.fn(),
        confirm,
        revoke: vi.fn(),
        dismiss: vi.fn(),
        acknowledge: vi.fn(),
        reload: vi.fn()
      }
    };
    const rendered = render(
      <I18nextProvider i18n={i18n}>
        <AgentPermissionMode control={control} />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: 'Enable full mode' })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
    rendered.rerender(
      <I18nextProvider i18n={i18n}>
        <AgentPermissionMode control={{ ...control, busy: true }} />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(control.actions.dismiss).toHaveBeenCalledOnce();
    rendered.unmount();
    render(
      <I18nextProvider i18n={i18n}>
        <AgentPermissionMode control={{ ...control, remainingSeconds: 0, acknowledged: true, confirmAllowed: true }} />
      </I18nextProvider>
    );
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Enable full mode' }));
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
