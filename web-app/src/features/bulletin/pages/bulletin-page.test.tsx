/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const controller = vi.hoisted(() => ({ useBulletinController: vi.fn() }));
vi.mock('../controller/bulletin-controller', () => controller);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { BulletinPage } from './bulletin-page';
import pageSource from './bulletin-page.tsx?raw';
import { formatBulletinTime } from '../model/bulletin-model';

describe('bulletin page', () => {
  afterEach(cleanup);
  it('handles the asynchronous refresh action at an explicit event boundary', () => {
    expect(pageSource).toContain('void actions.refresh()');
    expect(pageSource).toContain('onClick={handleRefresh}');
  });

  it('offers a visible keyboard-operable metrics action', () => {
    const select = vi.fn();
    controller.useBulletinController.mockReturnValue({
      state: {
        command: 'idle',
        dependencies: { kind: 'ready', apps: [], monitors: [], metrics: [] },
        draft: null,
        list: { kind: 'ready', records: [record], total: 1 },
        metrics: { kind: 'idle' },
        query: { search: '', pageIndex: 0, pageSize: 8 },
        refreshing: false,
        search: '',
        selectedId: null
      },
      actions: {
        changePage: vi.fn(),
        close: vi.fn(),
        create: vi.fn(),
        edit: vi.fn(),
        refresh: vi.fn(),
        remove: vi.fn(),
        save: vi.fn(),
        select,
        setSearch: vi.fn(),
        submitSearch: vi.fn(),
        updateDraft: vi.fn()
      }
    });
    render(<BulletinPage />);
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.delete' })).not.toBeInTheDocument();
    expect(screen.getByText(formatBulletinTime(record.gmtUpdate))).toBeInTheDocument();
    expect(screen.queryByText(record.gmtUpdate)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'bulletin.viewMetrics' }));
    expect(select).toHaveBeenCalledWith(7);
  });

  it('does not admit selection or row commands while a write owns the editor', () => {
    const select = vi.fn();
    controller.useBulletinController.mockReturnValue({
      state: {
        command: 'saving',
        dependencies: { kind: 'ready', apps: [], monitors: [], metrics: [] },
        draft: null,
        list: { kind: 'ready', records: [record], total: 1 },
        metrics: { kind: 'idle' },
        query: { search: '', pageIndex: 0, pageSize: 8 },
        refreshing: false,
        search: '',
        selectedId: 7
      },
      actions: {
        changePage: vi.fn(),
        close: vi.fn(),
        create: vi.fn(),
        edit: vi.fn(),
        refresh: vi.fn(),
        remove: vi.fn(),
        save: vi.fn(),
        select,
        setSearch: vi.fn(),
        submitSearch: vi.fn(),
        updateDraft: vi.fn()
      }
    });

    render(<BulletinPage />);

    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeDisabled();
    fireEvent.click(screen.getByText('Ops'));
    expect(select).not.toHaveBeenCalled();
  });
});

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
