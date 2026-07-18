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
import { afterEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted<{ value: unknown }>(() => ({ value: undefined }));
vi.mock('../controller/use-message-server-controller', () => ({ useMessageServerController: () => controller.value }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { MessageServerPage } from './message-server-page';

describe('MessageServerPage', () => {
  afterEach(cleanup);

  it('keeps invalid email evidence distinct while the missing SMS channel remains usable', () => {
    controller.value = state({ kind: 'invalid' }, { kind: 'missing' });
    render(<MessageServerPage />);

    expect(screen.getByText('messageServer.read.invalid')).toBeInTheDocument();
    expect(screen.queryByText('messageServer.read.unavailable')).not.toBeInTheDocument();
    expect(screen.getByText('messageServer.notConfigured')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'messageServer.configure' })).toBeEnabled();
  });

  it('does not present an enabled record with a cleared required secret as healthy', () => {
    controller.value = state({ kind: 'configured', config: { type: 0, emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false, emailStarttls: true,
      enable: true, configuredSecrets: [] } }, { kind: 'missing' });
    render(<MessageServerPage />);

    expect(screen.getAllByText('messageServer.status.unconfigured')).toHaveLength(2);
    expect(screen.queryByText('messageServer.status.enabled')).not.toBeInTheDocument();
  });
});

function state(email: unknown, sms: unknown) {
  return {
    email,
    sms,
    emailDraft: null,
    smsDraft: null,
    savingEmail: false,
    savingSms: false,
    actions: {
      openEmail: vi.fn(), openSms: vi.fn(), closeEmail: vi.fn(), closeSms: vi.fn(), updateEmail: vi.fn(),
      setEmailSecretCleared: vi.fn(), replaceSms: vi.fn(), retryEmail: vi.fn(), retrySms: vi.fn(),
      submitEmail: vi.fn(), submitSms: vi.fn()
    }
  };
}
