/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertInhibitRecovery } from './alert-inhibit-recovery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

describe('AlertInhibitRecovery', () => {
  it('offers one actionable proof retry', () => {
    const retry = vi.fn();
    render(
      <AlertInhibitRecovery
        recovery={{ kind: 'save', phase: 'proof', retryable: true }}
        retrying={false}
        retry={retry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('offers proof-only retry for commit-uncertain create recovery', () => {
    const retry = vi.fn();
    render(
      <AlertInhibitRecovery
        recovery={{ kind: 'save', phase: 'commit-uncertain', retryable: true }}
        retrying={false}
        retry={retry}
      />
    );

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
