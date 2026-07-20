/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { StatusComponentSection } from './status-management-sections';

describe('Status management recovery controls', () => {
  afterEach(cleanup);

  it('offers one explicit proof Retry while a component delete recovery owns the global lock', () => {
    const onRefresh = vi.fn().mockResolvedValue(true);
    render(
      <StatusComponentSection
        orgId={1}
        state={{ kind: 'error' }}
        commandLocked
        deleteRecovery
        deleteRecoveryPending={false}
        onNew={vi.fn()}
        onRefresh={onRefresh}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const refresh = screen.getByRole('button', { name: 'common.refresh' });
    expect(refresh).toBeDisabled();
    expect(screen.getByRole('button', { name: 'statusManagement.newComponent' })).toBeDisabled();
    expect(screen.getByText('statusManagement.unknown')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('disables the delete proof Retry while its retained receipt is being checked', () => {
    render(
      <StatusComponentSection
        orgId={1}
        state={{ kind: 'error' }}
        commandLocked
        deleteRecovery
        deleteRecoveryPending
        onNew={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(false)}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /common\.retry$/ })).toBeDisabled();
  });
});
