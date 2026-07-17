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
  it('offers a visible keyboard-operable metrics action', () => {
    const select = vi.fn();
    controller.useBulletinController.mockReturnValue({
      state: {
        command: 'idle', dependencies: { kind: 'ready', apps: [], monitors: [], metrics: [] }, draft: null,
        list: { kind: 'ready', records: [record], total: 1 }, metrics: { kind: 'idle' },
        query: { search: '', pageIndex: 0, pageSize: 8 }, refreshing: false, search: '', selectedId: null
      },
      actions: { changePage: vi.fn(), close: vi.fn(), create: vi.fn(), edit: vi.fn(), refresh: vi.fn(), remove: vi.fn(),
        save: vi.fn(), select, setSearch: vi.fn(), submitSearch: vi.fn(), updateDraft: vi.fn() }
    });
    render(<BulletinPage />);
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.delete' })).not.toBeInTheDocument();
    expect(screen.getByText(formatBulletinTime(record.gmtUpdate))).toBeInTheDocument();
    expect(screen.queryByText(record.gmtUpdate)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'bulletin.viewMetrics' }));
    expect(select).toHaveBeenCalledWith(7);
  });
});

const record = { id: 7, name: 'Ops', app: 'website', monitorIds: [1], fields: { responseTime: ['duration'] },
  creator: null, modifier: null, gmtCreate: null, gmtUpdate: '2026-07-17T16:41:46Z' };
