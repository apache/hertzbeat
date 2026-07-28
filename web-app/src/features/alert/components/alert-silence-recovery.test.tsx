/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AlertSilenceRecovery } from './alert-silence-recovery';

describe('AlertSilenceRecovery', () => {
  afterEach(cleanup);

  it('shows commit uncertainty without inventing an outage or an unsafe retry', () => {
    render(
      <AlertSilenceRecovery
        busy={false}
        recovery={{ kind: 'create', phase: 'commit-uncertain', retryable: false }}
        retry={vi.fn()}
      />
    );

    expect(screen.getByText('alertSilences.saveFailed')).toBeInTheDocument();
    expect(screen.queryByText('common.unavailable')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });

  it('offers an explicit proof retry while no request is active', () => {
    const retry = vi.fn();
    render(
      <AlertSilenceRecovery busy={false} recovery={{ kind: 'update', phase: 'proof', retryable: true }} retry={retry} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('keeps retained proof evidence visible but disables retry after capability loss', () => {
    const retry = vi.fn();
    render(
      <AlertSilenceRecovery
        busy={false}
        canRetry={false}
        recovery={{ kind: 'delete', phase: 'proof', retryable: true }}
        retry={retry}
      />
    );

    const button = screen.getByRole('button', { name: 'common.retry' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });
});
