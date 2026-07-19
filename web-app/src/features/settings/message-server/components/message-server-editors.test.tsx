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

  it('patches every editable email field without replacing the draft', () => {
    const update = vi.fn();
    render(
      <EmailServerEditor
        draft={createEmailServerDraft()}
        saving={false}
        update={update}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('messageServer.email.host'), { target: { value: 'smtp.example.test' } });
    fireEvent.change(screen.getByLabelText('messageServer.email.port'), { target: { value: '587' } });
    fireEvent.change(screen.getByLabelText('messageServer.email.port'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('messageServer.email.username'), { target: { value: 'ops@example.test' } });
    fireEvent.change(screen.getByLabelText('messageServer.email.password'), { target: { value: 'replacement' } });
    fireEvent.click(screen.getByRole('switch', { name: 'messageServer.email.ssl' }));
    fireEvent.click(screen.getByRole('switch', { name: 'messageServer.email.starttls' }));
    fireEvent.click(screen.getByRole('switch', { name: 'messageServer.enabled' }));

    expect(update.mock.calls).toEqual(
      expect.arrayContaining([
        [{ emailHost: 'smtp.example.test' }],
        [{ emailPort: 587 }],
        [{ emailPort: 0 }],
        [{ emailUsername: 'ops@example.test' }],
        [{ emailPassword: 'replacement' }],
        [{ emailSsl: false }],
        [{ emailStarttls: true }],
        [{ enable: true }]
      ])
    );
  });

  it('presents configured email secret state without ever echoing the saved value', () => {
    const configured = createEmailServerDraft({
      status: 'configured',
      config: {
        type: 0,
        emailHost: 'smtp.example.test',
        emailUsername: 'ops@example.test',
        emailPort: 587,
        emailSsl: false,
        emailStarttls: true,
        enable: true,
        configuredSecrets: ['emailPassword']
      }
    });
    const { rerender } = render(
      <EmailServerEditor
        draft={configured}
        saving={false}
        update={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );

    const password = screen.getByLabelText('messageServer.email.password');
    expect(screen.getByText('messageServer.secret.configured')).toBeInTheDocument();
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('placeholder', 'messageServer.secret.retainHint');

    rerender(
      <EmailServerEditor
        draft={{ ...configured, clearSecrets: ['emailPassword'] }}
        saving={false}
        update={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('messageServer.email.password')).toHaveAttribute(
      'placeholder',
      'messageServer.secret.clearPending'
    );

    rerender(
      <EmailServerEditor
        draft={createEmailServerDraft()}
        saving={false}
        update={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('messageServer.email.password')).toHaveAttribute(
      'placeholder',
      'messageServer.secret.enterHint'
    );
  });

  it('supports turning explicit email secret clearing on and off', () => {
    const setSecretCleared = vi.fn();
    const configured = createEmailServerDraft({
      status: 'configured',
      config: {
        type: 0,
        emailHost: 'smtp.example.test',
        emailUsername: 'ops@example.test',
        emailPort: 587,
        emailSsl: false,
        emailStarttls: true,
        enable: true,
        configuredSecrets: ['emailPassword']
      }
    });
    const { rerender } = render(
      <EmailServerEditor
        draft={configured}
        saving={false}
        update={vi.fn()}
        setSecretCleared={setSecretCleared}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'messageServer.secret.clearSaved' }));
    expect(setSecretCleared).toHaveBeenLastCalledWith(true);

    rerender(
      <EmailServerEditor
        draft={{ ...configured, clearSecrets: ['emailPassword'] }}
        saving={false}
        update={vi.fn()}
        setSecretCleared={setSecretCleared}
        close={vi.fn()}
        submit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'messageServer.secret.clearSaved' }));
    expect(setSecretCleared).toHaveBeenLastCalledWith(false);
  });

  it('keeps modal actions explicit, blocks mask dismissal, and exposes saving state', () => {
    const close = vi.fn();
    const submit = vi.fn();
    const { container } = render(
      <EmailServerEditor
        draft={createEmailServerDraft()}
        saving={false}
        update={vi.fn()}
        setSecretCleared={vi.fn()}
        close={close}
        submit={submit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    expect(submit).toHaveBeenCalledOnce();
    const modalWrap = container.ownerDocument.querySelector('.ant-modal-wrap');
    expect(modalWrap).not.toBeNull();
    fireEvent.click(modalWrap!);
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(close).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect(close).toHaveBeenCalledTimes(3);
  });

  it('blocks duplicate submit while saving', () => {
    const submit = vi.fn();
    render(
      <EmailServerEditor
        draft={createEmailServerDraft()}
        saving
        update={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={submit}
      />
    );
    const savingButton = screen.getByRole('button', { name: /common\.save$/ });
    expect(savingButton).toHaveClass('ant-btn-loading');
    fireEvent.click(savingButton);
    expect(submit).not.toHaveBeenCalled();
  });

  it('renders only the selected provider fields and treats Tencent IDs as secrets', () => {
    const draft = createSmsServerDraft();
    render(<SmsServerEditor draft={draft} saving={false} replace={vi.fn()} close={vi.fn()} submit={vi.fn()} />);

    expect(screen.getByLabelText('messageServer.sms.fields.secretId')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('messageServer.sms.fields.secretKey')).toHaveAttribute('type', 'password');
    expect(screen.queryByLabelText('messageServer.sms.fields.accessKeyId')).not.toBeInTheDocument();
  });
});
