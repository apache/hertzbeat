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

import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { AgentReviseProposal } from './agent-revise-proposal';
describe('explicit stop-before-manual-revision dialog', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);
  function view(revise = vi.fn().mockResolvedValue(true), disabled = false) {
    render(
      <I18nextProvider i18n={i18n}>
        <AgentReviseProposal approvalId="a" pendingCount={2} disabled={disabled} revise={revise} />
      </I18nextProvider>
    );
    return revise;
  }
  it('requires revision text and exposes the entire-run scope; sends no model request', async () => {
    const revise = view();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run and revise' }));
    expect(screen.getByText(/including 2 pending proposals/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel run and prepare draft' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Change only the test policy to disabled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run and prepare draft' }));
    await waitFor(() => expect(revise).toHaveBeenCalledExactlyOnceWith('a', 'Change only the test policy to disabled'));
  });
  it('closing the draft dialog does not reject, cancel or approve anything', () => {
    const revise = view();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run and revise' }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));
    expect(revise).not.toHaveBeenCalled();
  });
  it('a failed cancellation keeps the draft and gives no success claim', async () => {
    const revise = view(vi.fn().mockResolvedValue(false));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run and revise' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Revised test request' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel run and prepare draft' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be verified'));
    expect(screen.getByRole('textbox')).toHaveValue('Revised test request');
    expect(revise).toHaveBeenCalledTimes(1);
  });
  it('stopping state disables revision entry', () => {
    view(undefined, true);
    expect(screen.getByRole('button', { name: 'Cancel run and revise' })).toBeDisabled();
  });
});
