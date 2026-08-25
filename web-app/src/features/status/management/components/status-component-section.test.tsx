/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US', resolvedLanguage: 'en-US' } })
}));

import { StatusComponentSection } from './status-component-section';

describe('Status management recovery controls', () => {
  afterEach(cleanup);

  it('offers one explicit proof Retry while a component delete recovery owns the global lock', () => {
    const onRefresh = vi.fn().mockResolvedValue(true);
    render(
      <StatusComponentSection
        canCreate
        canUpdate
        canDelete
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
        canCreate
        canUpdate
        canDelete
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

describe('Status component configuration workspace', () => {
  afterEach(cleanup);

  it('keeps the bounded component list free of a duplicate public preview', () => {
    render(
      <StatusComponentSection
        canCreate
        canUpdate
        canDelete
        orgId={1}
        state={{
          kind: 'ready',
          records: [
            {
              id: 3,
              orgId: 1,
              name: 'API',
              description: 'Public API',
              method: 0,
              state: 0,
              configState: 0
            }
          ]
        }}
        commandLocked={false}
        deleteRecovery={false}
        deleteRecoveryPending={false}
        onNew={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(true)}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const collection = screen.getByRole('list', { name: 'statusManagement.componentCollection' });
    expect(within(collection).getByText('API')).toBeInTheDocument();
    expect(within(collection).getByText('statusManagement.automatic')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-table')).toBeNull();
  });
});
