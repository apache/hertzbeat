/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createNoticeReceiverDraft } from '../model/notice-receiver-model';
import { NoticeReceiverEditor } from './notice-receiver-editor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('NoticeReceiverEditor', () => {
  it('shows configured-secret retain and explicit clear controls without echoing the value', () => {
    const update = vi.fn();
    const setSecretCleared = vi.fn();
    const draft = { ...createNoticeReceiverDraft(), id: 8, name: 'Slack', type: 8 as const,
      configuredSecrets: ['slackWebHookUrl' as const] };
    render(<NoticeReceiverEditor draft={draft} saving={false} testing={false} update={update}
      selectType={vi.fn()} setSecretCleared={setSecretCleared} close={vi.fn()} submit={vi.fn()} test={vi.fn()} />);

    const secret = screen.getByPlaceholderText('noticeReceivers.secret.retainHint');
    expect(secret).toHaveValue('');
    expect(screen.queryByDisplayValue(/https?:\/\//)).not.toBeInTheDocument();
    fireEvent.change(secret, { target: { value: 'replacement' } });
    expect(update).toHaveBeenCalledWith({ slackWebHookUrl: 'replacement' });
    fireEvent.click(screen.getByText('noticeReceivers.secret.clearSaved'));
    expect(setSecretCleared).toHaveBeenCalledWith('slackWebHookUrl', true);
  });
});
