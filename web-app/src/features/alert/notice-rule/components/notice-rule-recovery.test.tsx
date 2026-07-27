/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NoticeRuleRecovery } from './notice-rule-recovery';

describe('Notice Rule recovery', () => {
  it('does not offer a fake retry after create identity becomes commit-uncertain', () => {
    render(
      <NoticeRuleRecovery
        recovery={{
          kind: 'create',
          phase: 'commit-uncertain',
          failure: 'commit-uncertain',
          retryable: false
        }}
        canRetry={false}
        retryBusy={false}
        retry={vi.fn()}
      />
    );

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  });
});
