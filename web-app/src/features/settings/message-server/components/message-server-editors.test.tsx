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
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { createEmailServerDraft, createSmsServerDraft } from '../model/message-server-model';
import { EmailServerEditor, SmsServerEditor } from './message-server-editors';

describe('message server editors', () => {
  afterEach(cleanup);

  it('shows configured email secrets without echoing them and supports explicit clear', () => {
    const clear = vi.fn();
    const draft = createEmailServerDraft({ status: 'configured', config: { type: 0,
      emailHost: 'smtp.example.test', emailUsername: 'ops@example.test', emailPort: 587,
      emailSsl: false, emailStarttls: true, enable: true, configuredSecrets: ['emailPassword'] } });
    render(<EmailServerEditor draft={draft} saving={false} update={vi.fn()} setSecretCleared={clear}
      close={vi.fn()} submit={vi.fn()} />);

    expect(screen.getByText('messageServer.secret.configured')).toBeInTheDocument();
    expect(screen.getByLabelText('messageServer.email.password')).toHaveValue('');
    fireEvent.click(screen.getByRole('checkbox', { name: 'messageServer.secret.clearSaved' }));
    expect(clear).toHaveBeenCalledWith(true);
  });

  it('renders only the selected provider fields and treats Tencent IDs as secrets', () => {
    const draft = createSmsServerDraft();
    render(<SmsServerEditor draft={draft} saving={false} replace={vi.fn()} close={vi.fn()} submit={vi.fn()} />);

    expect(screen.getByLabelText('messageServer.sms.fields.secretId')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('messageServer.sms.fields.secretKey')).toHaveAttribute('type', 'password');
    expect(screen.queryByLabelText('messageServer.sms.fields.accessKeyId')).not.toBeInTheDocument();
  });
});
