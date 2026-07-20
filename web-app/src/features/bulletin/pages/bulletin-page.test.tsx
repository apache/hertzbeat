/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ useBulletinController: vi.fn() }));
vi.mock('../controller/bulletin-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { BulletinPage } from './bulletin-page';
import { formatBulletinTime } from '../model/bulletin-model';

describe('bulletin page', () => {
  afterEach(cleanup);
  it('handles the asynchronous refresh action at an explicit event boundary', () => {
    const current = pageController();
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));

    expect(current.actions.refresh).toHaveBeenCalledOnce();
  });

  it('offers a visible keyboard-operable metrics action', () => {
    const current = pageController();
    controller.useBulletinController.mockReturnValue(current.value);
    render(<BulletinPage />);
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.delete' })).not.toBeInTheDocument();
    expect(screen.getByText(formatBulletinTime(record.gmtUpdate))).toBeInTheDocument();
    expect(screen.queryByText(record.gmtUpdate)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'bulletin.viewMetrics' }));
    expect(current.actions.select).toHaveBeenCalledWith(7);
  });

  it('does not admit selection or row commands while a write owns the editor', () => {
    const current = pageController({ command: 'saving', selectedId: 7 });
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);

    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeDisabled();
    fireEvent.click(screen.getByText('Ops'));
    expect(current.actions.select).not.toHaveBeenCalled();
  });
});

function pageController({
  command = 'idle',
  selectedId = null
}: { command?: 'idle' | 'saving'; selectedId?: number | null } = {}) {
  const actions = {
    changePage: vi.fn(),
    close: vi.fn(),
    create: vi.fn(),
    edit: vi.fn(),
    refresh: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
    select: vi.fn(),
    setSearch: vi.fn(),
    submitSearch: vi.fn(),
    updateDraft: vi.fn()
  };
  return {
    actions,
    value: {
      state: {
        command,
        dependencies: { kind: 'ready', apps: [], monitors: [], metrics: [] },
        draft: null,
        list: { kind: 'ready', records: [record], total: 1 },
        metrics: { kind: 'idle' },
        query: { search: '', pageIndex: 0, pageSize: 8 },
        refreshing: false,
        search: '',
        selectedId
      },
      actions
    }
  };
}

const record = {
  id: 7,
  name: 'Ops',
  app: 'website',
  monitorIds: [1],
  fields: { responseTime: ['duration'] },
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: '2026-07-17T16:41:46Z'
};
