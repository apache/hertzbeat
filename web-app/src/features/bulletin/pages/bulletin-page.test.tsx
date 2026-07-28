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

  it('keeps query drafting and explicit submission on the page controller boundary', () => {
    const current = pageController();
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);
    const search = screen.getByPlaceholderText('bulletin.search');
    fireEvent.change(search, { target: { value: 'gateway' } });
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });

    expect(current.actions.setSearch).toHaveBeenCalledWith('gateway');
    expect(current.actions.submitSearch).toHaveBeenCalledOnce();
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

  it('selects the authoritative page and confirms one batch delete', async () => {
    const current = pageController({ selectedIds: [7] });
    controller.useBulletinController.mockReturnValue(current.value);
    render(<BulletinPage />);

    fireEvent.click(screen.getByRole('button', { name: 'bulletin.deleteSelected' }));
    fireEvent.click(await screen.findByRole('button', { name: 'common.delete' }));

    expect(current.actions.removeMany).toHaveBeenCalledWith([7]);
  });

  it('delegates table checkbox selection to the authoritative page controller', () => {
    const current = pageController();
    controller.useBulletinController.mockReturnValue(current.value);
    render(<BulletinPage />);

    fireEvent.click(screen.getAllByRole('checkbox')[1]!);

    expect(current.actions.selectIds).toHaveBeenCalledWith([7]);
  });

  it('does not admit selection or row commands while a write owns the editor', () => {
    const current = pageController({ command: 'saving', selectedId: 7 });
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);

    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeDisabled();
    expect(screen.getByPlaceholderText('bulletin.search')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeDisabled();
    expect(screen.getAllByRole('checkbox').every(checkbox => checkbox.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(screen.getByText('Ops'));
    expect(current.actions.select).not.toHaveBeenCalled();
  });

  it('keeps retained proof recovery visible and retries only through its recovery action', () => {
    const current = pageController({
      recovery: {
        stage: 'update-proof',
        draft: { ...record },
        failure: 'unavailable'
      }
    });
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);

    expect(screen.getByText('bulletin.save.unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bulletin.create' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(current.actions.retry).toHaveBeenCalledOnce();
  });

  it('keeps GUEST read controls and metrics selection while hiding every write and delete affordance', () => {
    const current = pageController({
      capabilities: { canRead: true, canWrite: false, canDelete: false },
      draft: record,
      selectedId: 7,
      selectedIds: [7]
    });
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);

    expect(screen.getByPlaceholderText('bulletin.search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'bulletin.create' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'bulletin.delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'bulletin.deleteSelected' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'bulletin.viewMetrics' }));
    expect(current.actions.select).toHaveBeenCalledWith(7);
  });

  it('renders USER authoring while hiding administrator-only deletion and selection', () => {
    const current = pageController({
      capabilities: { canRead: true, canWrite: true, canDelete: false },
      draft: record,
      selectedId: 7,
      selectedIds: [7]
    });
    controller.useBulletinController.mockReturnValue(current.value);

    render(<BulletinPage />);

    expect(screen.getByRole('button', { name: 'bulletin.create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'bulletin.delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'bulletin.deleteSelected' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('synchronously converges role presentation without removing legal metrics selection', () => {
    const admin = pageController({ selectedId: 7, selectedIds: [7] });
    controller.useBulletinController.mockReturnValue(admin.value);
    const page = render(<BulletinPage />);
    expect(screen.getByRole('button', { name: 'bulletin.delete' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).not.toEqual([]);

    const user = pageController({
      capabilities: { canRead: true, canWrite: true, canDelete: false },
      selectedId: 7
    });
    controller.useBulletinController.mockReturnValue(user.value);
    page.rerender(<BulletinPage />);
    expect(screen.queryByRole('button', { name: 'bulletin.delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeInTheDocument();

    const guest = pageController({
      capabilities: { canRead: true, canWrite: false, canDelete: false },
      selectedId: 7
    });
    controller.useBulletinController.mockReturnValue(guest.value);
    page.rerender(<BulletinPage />);
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'bulletin.viewMetrics' })).toBeInTheDocument();
  });

  it('renders only local permission keys for list, dependencies, and metrics failures', () => {
    const current = pageController({ draft: record });
    controller.useBulletinController.mockReturnValue({
      ...current.value,
      state: {
        ...current.value.state,
        dependencies: {
          ...current.value.state.dependencies,
          kind: 'permission'
        },
        list: { kind: 'permission' },
        metrics: { kind: 'permission' }
      }
    });

    render(<BulletinPage />);

    expect(screen.getByText('bulletin.list.permission')).toBeInTheDocument();
    expect(screen.getByText('bulletin.dependencies.permission')).toBeInTheDocument();
    expect(screen.getByText('bulletin.metrics.permission')).toBeInTheDocument();
    expect(screen.queryByText('private authorization detail')).not.toBeInTheDocument();
  });
});

function pageController({
  capabilities = { canRead: true, canWrite: true, canDelete: true },
  command = 'idle',
  draft = null,
  recovery = null,
  selectedId = null,
  selectedIds = []
}: {
  capabilities?: { canRead: boolean; canWrite: boolean; canDelete: boolean };
  command?: 'idle' | 'saving';
  draft?: typeof record | null;
  recovery?: null | {
    stage: 'update-proof';
    draft: typeof record;
    failure: 'unavailable';
  };
  selectedId?: number | null;
  selectedIds?: number[];
} = {}) {
  const actions = {
    changePage: vi.fn(),
    close: vi.fn(),
    create: vi.fn(),
    edit: vi.fn(),
    refresh: vi.fn(),
    remove: vi.fn(),
    removeMany: vi.fn(),
    retry: vi.fn(),
    save: vi.fn(),
    select: vi.fn(),
    selectIds: vi.fn(),
    setSearch: vi.fn(),
    submitSearch: vi.fn(),
    updateDraft: vi.fn()
  };
  return {
    actions,
    value: {
      state: {
        capabilities,
        command,
        dependencies: {
          kind: 'ready',
          apps: [],
          fieldSelection: 'valid',
          metricTree: [],
          metrics: [],
          monitorSelection: 'valid',
          monitors: []
        },
        draft,
        list: { kind: 'ready', records: [record], total: 1 },
        metrics: { kind: 'idle' },
        query: { search: '', pageIndex: 0, pageSize: 8 },
        recovery,
        refreshing: false,
        search: '',
        selectedId,
        selectedIds
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
