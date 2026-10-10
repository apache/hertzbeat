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
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { initializeI18n } from '@/core/i18n/i18n';

import { createOptionalDraft } from '../model/setup-optional';
import { SetupOptionalForm, type SetupOptionalFormProps } from './setup-optional-form';

describe('SetupOptionalForm', () => {
  beforeAll(() => initializeI18n());
  afterEach(cleanup);

  it('requires explicit acknowledgement of every server warning before completion', () => {
    const complete = vi.fn();
    renderOptionalForm({
      pendingWarnings: ['public_address_plaintext', 'mail_security_none'],
      complete
    });

    expect(screen.getByText('The public address uses unencrypted HTTP.')).toBeInTheDocument();
    expect(screen.getByText('Mail transport encryption is disabled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Test mail connection' })).toBeDisabled();
    const finish = screen.getByRole('button', { name: 'Finish setup' });
    expect(finish).toBeDisabled();
    fireEvent.click(finish);
    expect(complete).not.toHaveBeenCalled();
  });

  it('uses the current address by default and asks for a full address only behind a proxy', () => {
    const updateDraft = vi.fn();
    renderOptionalForm({ updateDraft });

    expect(screen.getByText('http://127.0.0.1:1157')).toBeInTheDocument();
    const proxy = screen.getByRole('checkbox', { name: 'Use a load balancer or proxy' });
    expect(proxy).not.toBeChecked();
    expect(screen.queryByLabelText('External public URL')).not.toBeInTheDocument();
    fireEvent.click(proxy);
    expect(updateDraft).toHaveBeenCalledWith({ useProxy: true });
    expect(screen.queryByLabelText('Server OTLP HTTP endpoint')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Server OTLP gRPC endpoint')).not.toBeInTheDocument();
  });

  it('shows the proxy address field only when proxy mode is enabled', () => {
    const draft = createOptionalDraft();
    draft.useProxy = true;
    renderOptionalForm({ draft });

    expect(screen.getByLabelText('External public URL')).toBeInTheDocument();
  });
});

function renderOptionalForm(overrides: Partial<SetupOptionalFormProps> = {}) {
  const props: SetupOptionalFormProps = {
    draft: createOptionalDraft(),
    publicOrigin: 'http://127.0.0.1:1157',
    updateDraft: vi.fn(),
    save: vi.fn(),
    savePending: false,
    saveFailureKey: null,
    validatePublicAccess: vi.fn(),
    validateMail: vi.fn(),
    validation: { publicAccess: null, mail: null },
    pendingWarnings: [],
    acknowledgedWarnings: [],
    setWarningAcknowledged: vi.fn(),
    complete: vi.fn(),
    completePending: false,
    completeFailureKey: null,
    ...overrides
  };
  render(
    <AppProviders>
      <SetupOptionalForm {...props} />
    </AppProviders>
  );
}
