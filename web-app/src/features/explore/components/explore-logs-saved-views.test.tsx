/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ConfigProvider } from 'antd';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { buildSavedQueryPayload } from '../model/explore-saved-query-model';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreLogsViewTrigger, ExploreLogsViewsRail } from './explore-logs-saved-views';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

const record = buildSavedQueryPayload(
  { signal: 'logs', timeRange: 'last-30m', query: 'service:codex-app-server' },
  'codex',
  'Codex logs',
  'service:codex-app-server'
);

function model(overrides: Partial<SavedQueriesViewModel> = {}) {
  return {
    open: false,
    groups: [{ signal: 'logs', state: 'ready', records: [record] }],
    active: undefined,
    activeUnavailable: false,
    activeLoading: false,
    activeChanged: false,
    dirty: false,
    canWrite: true,
    saveBlocked: false,
    busy: false,
    error: undefined,
    editor: undefined,
    query: { signal: 'logs', timeRange: 'last-30m' },
    setOpen: vi.fn(),
    reopenDefault: vi.fn(),
    refresh: vi.fn(),
    begin: vi.fn(),
    closeEditor: vi.fn(),
    edit: vi.fn(),
    save: vi.fn(),
    updateActive: vi.fn(),
    remove: vi.fn(),
    reopen: vi.fn(),
    ...overrides
  } as SavedQueriesViewModel;
}

function view(node: React.ReactNode) {
  render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

describe('Logs saved views', () => {
  it('offers the audited directory controls without exposing excluded view links', () => {
    const current = model({ open: true, active: record });
    view(<ExploreLogsViewsRail model={current} />);
    expect(screen.queryByRole('button', { name: i18n.t('exploreSaved.copyUrl') })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: i18n.t('exploreSaved.sort') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: i18n.t('exploreSaved.onlyMine') })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: i18n.t('exploreSaved.addFavorite', { view: record.label }) })
    ).toBeInTheDocument();
  });

  it('filters by the persisted creator and changes favorite state without opening the view', () => {
    const other = { ...record, viewKey: 'team-view', label: 'Team view', creator: 'someone-else' };
    const current = model({
      open: true,
      username: 'operator',
      directoryPreferences: { sort: 'default', onlyMine: true, favoriteKeys: [], recentKeys: [] },
      groups: [{ signal: 'logs', state: 'ready', records: [{ ...record, creator: 'operator' }, other] }],
      toggleFavorite: vi.fn(),
      setOnlyMine: vi.fn()
    });
    view(<ExploreLogsViewsRail model={current} />);
    expect(screen.getByRole('button', { name: record.label })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: other.label })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('exploreSaved.addFavorite', { view: record.label }) }));
    expect(current.toggleFavorite).toHaveBeenCalledWith(record.viewKey);
    fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('exploreSaved.onlyMine') }));
    expect(current.setOnlyMine).toHaveBeenCalledWith(false);
  });

  it('starts a new view from the current query above the view filter', () => {
    const current = model({ open: true, active: record });
    view(<ExploreLogsViewsRail model={current} />);
    const saveNew = screen.getByRole('button', { name: i18n.t('exploreSaved.saveNewView') });
    expect(
      saveNew.compareDocumentPosition(screen.getByRole('textbox', { name: i18n.t('exploreSaved.filterViews') })) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);
    fireEvent.click(saveNew);
    expect(current.begin).toHaveBeenCalledWith('copy');
  });

  it('updates the views tab from the default name to the selected view name', () => {
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogsViewTrigger model={model({ open: true })} />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.myView'), expanded: true })).toBeInTheDocument();
    rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreLogsViewTrigger model={model({ open: true, active: record })} />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: record.label, expanded: true })).toBeInTheDocument();
  });

  it('keeps a saved-view reference visible while its record is loading or unavailable', () => {
    const loading = model({
      activeLoading: true,
      query: { signal: 'logs', timeRange: 'last-30m', savedView: 'pending' }
    });
    view(<ExploreLogsViewTrigger model={loading} />);
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.states.loading') })).toBeInTheDocument();

    cleanup();
    const unavailable = model({
      activeUnavailable: true,
      query: { signal: 'logs', timeRange: 'last-30m', savedView: 'missing' }
    });
    view(<ExploreLogsViewTrigger model={unavailable} />);
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.activeUnavailable') })).toBeInTheDocument();
  });

  it('shows Save Changes in the view bar only for a changed active view', () => {
    const current = model({ active: record, activeChanged: true });
    view(<ExploreLogsViewTrigger model={current} />);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreSaved.saveChanges') }));
    expect(current.updateActive).toHaveBeenCalledOnce();
  });

  it('opens an inline views rail and restores a saved view without leaving the workspace', () => {
    const current = model({ open: true });
    view(
      <>
        <ExploreLogsViewTrigger model={current} />
        <ExploreLogsViewsRail model={current} />
      </>
    );
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.myView'), expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: i18n.t('exploreSaved.views') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Codex logs' }));
    expect(current.reopen).toHaveBeenCalledWith(record);
    expect(current.setOpen).not.toHaveBeenCalledWith(false);
  });

  it('keeps save and update actions beside the selected view', () => {
    const current = model({ open: true, active: record });
    view(<ExploreLogsViewsRail model={current} />);
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.saveChanges') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreSaved.saveAs') }));
    expect(current.begin).toHaveBeenCalledWith('copy');
    cleanup();
    const changed = model({ open: true, active: record, activeChanged: true });
    view(<ExploreLogsViewsRail model={changed} />);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreSaved.saveChanges') }));
    expect(changed.updateActive).toHaveBeenCalledOnce();
  });

  it('confirms before leaving a view while its metadata form is open', () => {
    const reopenDefault = vi.fn();
    const current = model({
      open: true,
      active: record,
      editor: { mode: 'update', viewKey: record.viewKey, label: 'Edited', description: '' },
      reopenDefault
    });
    view(<ExploreLogsViewsRail model={current} />);
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.saveAs') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreSaved.myView') }));
    expect(screen.getByText(i18n.t('common.unsavedChangesConfirm'))).toBeInTheDocument();
    expect(reopenDefault).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!);
    expect(reopenDefault).not.toHaveBeenCalled();
  });
});

it.each(['trigger', 'filter'])(
  'closes views from %s on Escape, restores the actual trigger and preserves the draft',
  target => {
    const current = model({ open: true, dirty: true });
    view(
      <>
        <ExploreLogsViewTrigger model={current} />
        <ExploreLogsViewsRail model={current} />
      </>
    );
    const trigger = screen.getByRole('button', { name: i18n.t('exploreSaved.myView'), expanded: true });
    const focused =
      target === 'trigger' ? trigger : screen.getByRole('textbox', { name: i18n.t('exploreSaved.filterViews') });
    focused.focus();
    fireEvent.keyDown(focused, { key: 'Escape' });
    expect(current.setOpen).toHaveBeenCalledExactlyOnceWith(false);
    expect(trigger).toHaveFocus();
    expect(current.closeEditor).not.toHaveBeenCalled();
    expect(current.save).not.toHaveBeenCalled();
    expect(current.dirty).toBe(true);
  }
);
it('gives the expanded inner sort menu its first Escape', () => {
  const current = model({ open: true });
  view(
    <>
      <ExploreLogsViewTrigger model={current} />
      <ExploreLogsViewsRail model={current} />
    </>
  );
  const combo = screen.getByRole('combobox', { name: i18n.t('exploreSaved.sort') });
  fireEvent.mouseDown(combo);
  expect(combo).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(combo, { key: 'Escape' });
  expect(current.setOpen).not.toHaveBeenCalled();
});

it('dismisses the pending view-switch confirmation before the rail from its anchor and popup', () => {
  const current = model({
    open: true,
    active: record,
    editor: { mode: 'update', viewKey: record.viewKey, label: 'Edited', description: '' }
  });
  view(
    <>
      <ExploreLogsViewTrigger model={current} />
      <ExploreLogsViewsRail model={current} />
    </>
  );
  const anchor = screen.getByRole('button', { name: i18n.t('exploreSaved.myView') });
  fireEvent.click(anchor);
  fireEvent.keyDown(anchor, { key: 'Escape' });
  expect(current.setOpen).not.toHaveBeenCalled();
  expect(current.reopenDefault).not.toHaveBeenCalled();
  expect(anchor).toHaveFocus();
  fireEvent.click(anchor);
  const cancel = screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!;
  cancel.focus();
  fireEvent.keyDown(cancel, { key: 'Escape' });
  expect(current.setOpen).not.toHaveBeenCalled();
  expect(current.closeEditor).not.toHaveBeenCalled();
  expect(anchor).toHaveFocus();
});

it('closes the inner More menu before the rail when Escape is pressed on its anchor', async () => {
  const current = model({ open: true, active: record });
  view(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <ExploreLogsViewTrigger model={current} />
      <ExploreLogsViewsRail model={current} />
    </ConfigProvider>
  );
  const more = screen.getByRole('button', { name: i18n.t('exploreSaved.moreActions') });
  fireEvent.mouseEnter(more);
  const menu = await screen.findByRole('menu');
  more.focus();
  fireEvent.keyDown(more, { key: 'Escape' });
  await waitFor(() => expect(menu.closest('.ant-dropdown')).toHaveClass('ant-dropdown-hidden'));
  expect(current.setOpen).not.toHaveBeenCalled();
  expect(more).toHaveFocus();
});
