/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreSavedQueryActions } from './explore-saved-query-actions';

vi.mock('./explore-saved-query-drawer', () => ({ ExploreSavedQueryDrawer: () => null }));
vi.mock('./explore-saved-query-editor', () => ({ ExploreSavedQueryEditor: () => null }));

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

describe('Logs query actions', () => {
  it('keeps one secondary trigger and exposes saved controls, status, and related actions inside it', async () => {
    const model = {
      active: undefined,
      activeUnavailable: true,
      activeLoading: false,
      busy: false,
      canWrite: true,
      dirty: false,
      saveBlocked: true,
      sourcePending: false,
      setOpen: vi.fn(),
      begin: vi.fn()
    } as unknown as SavedQueriesViewModel;
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreSavedQueryActions model={model} compact>
          <button type="button">Share</button>
        </ExploreSavedQueryActions>
      </I18nextProvider>
    );
    const trigger = screen.getByRole('button', { name: i18n.t('exploreSaved.activeUnavailable') });
    expect(trigger).toHaveAttribute('title', i18n.t('exploreSaved.activeUnavailable'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Saved queries' })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Query actions' })).toHaveFocus();
    expect(await screen.findByRole('button', { name: 'Saved queries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('exploreSaved.activeUnavailable'));
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Query actions' }), { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Saved queries' }));
    expect(model.setOpen).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the popover when opening the saved-query editor', async () => {
    const model = {
      active: undefined,
      activeUnavailable: false,
      activeLoading: false,
      busy: false,
      canWrite: true,
      dirty: false,
      saveBlocked: false,
      sourcePending: false,
      setOpen: vi.fn(),
      begin: vi.fn()
    } as unknown as SavedQueriesViewModel;
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreSavedQueryActions model={model} compact />
      </I18nextProvider>
    );
    const trigger = screen.getByRole('button', { name: i18n.t('exploreSaved.myView') });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Save query' }));
    expect(model.begin).toHaveBeenCalledWith('create');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not announce a failed restore while the saved source is still loading', () => {
    const model = {
      activeUnavailable: true,
      activeLoading: true,
      dirty: false,
      saveBlocked: true,
      sourcePending: true
    } as unknown as SavedQueriesViewModel;
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreSavedQueryActions model={model} compact />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: i18n.t('exploreSaved.states.loading') })).not.toHaveAttribute('title');
  });
});
