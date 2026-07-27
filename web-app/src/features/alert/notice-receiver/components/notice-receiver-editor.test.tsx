/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNoticeReceiverDraft } from '../model/notice-receiver-model';
import { NoticeReceiverEditor } from './notice-receiver-editor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('NoticeReceiverEditor', () => {
  afterEach(cleanup);
  it('shows configured-secret retain and explicit clear controls without echoing the value', () => {
    const update = vi.fn();
    const setSecretCleared = vi.fn();
    const draft = {
      ...createNoticeReceiverDraft(),
      id: 8,
      name: 'Slack',
      type: 8 as const,
      configuredSecrets: ['slackWebHookUrl' as const]
    };
    render(
      <NoticeReceiverEditor
        draft={draft}
        saving={false}
        testing={false}
        update={update}
        busy={false}
        canTest
        selectType={vi.fn()}
        setSecretCleared={setSecretCleared}
        close={vi.fn()}
        submit={vi.fn()}
        test={vi.fn()}
      />
    );

    const secret = screen.getByPlaceholderText('noticeReceivers.secret.retainHint');
    expect(secret).toHaveValue('');
    expect(screen.queryByDisplayValue(/https?:\/\//)).not.toBeInTheDocument();
    fireEvent.change(secret, { target: { value: 'replacement' } });
    expect(update).toHaveBeenCalledWith({ slackWebHookUrl: 'replacement' });
    fireEvent.click(screen.getByText('noticeReceivers.secret.clearSaved'));
    expect(setSecretCleared).toHaveBeenCalledWith('slackWebHookUrl', true);
  });

  it('disables every draft mutation and close affordance while busy', () => {
    const draft = { ...createNoticeReceiverDraft(), name: 'Email', email: 'ops@example.test' };
    render(
      <NoticeReceiverEditor
        draft={draft}
        saving
        testing={false}
        busy
        canTest
        update={vi.fn()}
        selectType={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
        test={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Email')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'noticeReceivers.test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
    expect(screen.getByText('common.save').closest('button')).toBeDisabled();
  });

  it('publishes the backend name limit on the name control', () => {
    render(
      <NoticeReceiverEditor
        draft={{
          ...createNoticeReceiverDraft(),
          name: 'WeCom',
          type: 10,
          corpId: 'corp',
          agentId: 1,
          appSecret: 'secret',
          userId: 'ops'
        }}
        saving={false}
        testing={false}
        busy={false}
        canTest
        update={vi.fn()}
        selectType={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
        test={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('WeCom')).toHaveAttribute('maxlength', '100');
  });

  it('hides normal and retained test controls when test admission is unavailable', () => {
    const draft = { ...createNoticeReceiverDraft(), name: 'Email', email: 'ops@example.test' };
    const base = {
      draft,
      saving: false,
      testing: false,
      busy: false,
      canTest: false,
      update: vi.fn(),
      selectType: vi.fn(),
      setSecretCleared: vi.fn(),
      close: vi.fn(),
      submit: vi.fn()
    };
    const view = render(<NoticeReceiverEditor {...base} test={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'noticeReceivers.test' })).not.toBeInTheDocument();
    expect(screen.getByText('common.save').closest('button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument();

    view.rerender(
      <NoticeReceiverEditor
        {...base}
        busy
        testRecovery={{ phase: 'delivery-uncertain', failure: 'unavailable' }}
        retryTest={vi.fn()}
        dismissTestRecovery={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });

  it('requires an explicit retry or cancel after test delivery becomes uncertain', () => {
    const retryTest = vi.fn();
    const dismissTestRecovery = vi.fn();
    render(
      <NoticeReceiverEditor
        draft={{ ...createNoticeReceiverDraft(), name: 'Email', email: 'ops@example.test' }}
        saving={false}
        testing={false}
        busy
        canTest
        testRecovery={{ phase: 'delivery-uncertain', failure: 'unavailable' }}
        update={vi.fn()}
        selectType={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
        retryTest={retryTest}
        dismissTestRecovery={dismissTestRecovery}
      />
    );

    expect(screen.getByText('noticeReceivers.testError.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retryTest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(dismissTestRecovery).toHaveBeenCalledTimes(1);
  });

  it('does not allow cancellation or another retry while an explicit retry is in flight', () => {
    render(
      <NoticeReceiverEditor
        draft={{ ...createNoticeReceiverDraft(), name: 'Email', email: 'ops@example.test' }}
        saving={false}
        testing
        busy
        canTest
        testRecovery={{ phase: 'delivery-uncertain', failure: 'error' }}
        update={vi.fn()}
        selectType={vi.fn()}
        setSecretCleared={vi.fn()}
        close={vi.fn()}
        submit={vi.fn()}
        retryTest={vi.fn()}
        dismissTestRecovery={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /common.retry/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
  });
});
