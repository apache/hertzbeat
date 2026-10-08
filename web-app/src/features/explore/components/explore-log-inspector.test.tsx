/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { LogRow } from '../model/explore-signal-contract';
import { useEvidenceCopy } from './explore-evidence-copy';
import { logInspectorFields } from './explore-log-inspector-model';
import { ExploreLogInspector } from './explore-log-inspector';

const writeText = vi.fn<(value: string) => Promise<void>>();

describe('ExploreLogInspector', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });
  afterEach(cleanup);

  it('renders one flat inspector surface with row navigation, Fields/JSON, and real evidence actions', async () => {
    const openPath = vi.fn();
    const onSelectIndex = vi.fn();
    const onClose = vi.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={row}
          selectedIndex={1}
          rowCount={3}
          evidenceCurrent
          onSelectIndex={onSelectIndex}
          onInvestigate={() => {
            openPath('/explore?logRecordUid=record-1');
          }}
          onOpenTrace={() => {
            openPath('/explore?traceId=0123');
          }}
          onClose={onClose}
        />
      </I18nextProvider>
    );

    const inspector = screen.getByRole('dialog', { name: 'Log details' });
    expect(inspector).toHaveAttribute('aria-modal', 'false');
    expect(inspector).toHaveAttribute('data-card-depth', '1');
    expect(inspector.querySelector('[data-card-depth="2"]')).not.toBeInTheDocument();
    expect(inspector.querySelector('[data-field="resource.service.name"]')).toHaveTextContent('checkout');
    expect(within(inspector).getByRole('tree')).toBeInTheDocument();

    fireEvent.click(within(inspector).getByRole('button', { name: 'Previous log' }));
    expect(onSelectIndex).toHaveBeenCalledWith(0);
    fireEvent.click(within(inspector).getByRole('button', { name: 'Next log' }));
    expect(onSelectIndex).toHaveBeenCalledWith(2);

    fireEvent.click(within(inspector).getByRole('tab', { name: 'JSON' }));
    expect(within(inspector).getByRole('tabpanel', { name: 'JSON' })).toHaveTextContent('"logRecordUid": "record-1"');
    expect(JSON.parse(within(inspector).getByRole('tabpanel', { name: 'JSON' }).textContent ?? '')).toEqual(row);
    fireEvent.click(within(inspector).getByRole('button', { name: 'Copy log' }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(row, null, 2));
    expect(await within(inspector).findByText('Log copied')).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(within(inspector).getByRole('button', { name: 'Investigate' }));
    fireEvent.click(within(inspector).getByRole('button', { name: 'Open trace' }));
    expect(openPath).toHaveBeenCalledTimes(2);
    fireEvent.click(within(inspector).getByRole('button', { name: 'Close inspector' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(view.container.querySelector('.ant-card')).not.toBeInTheDocument();
  });

  it('offers filters for safe flat and nested scalars without conflating dotted keys', () => {
    const sample = {
      ...row,
      resource: {
        'service.name': 'checkout',
        'service.namespace': 'shop',
        'deployment.environment.name': 'prod',
        nested: { child: 'value' },
        list: ['one'],
        unsafe: 'path\\tail',
        'nested.child': 'flat',
        active: false,
        retries: 0
      }
    };
    const fields = logInspectorFields(sample);
    expect(fields.filter(field => field.key.startsWith('resource.')).map(field => field.key)).toEqual(
      expect.arrayContaining([
        'resource.service.name',
        'resource.service.namespace',
        'resource.deployment.environment.name'
      ])
    );
    expect(fields.filter(field => field.filter).map(field => field.filter)).toEqual(
      expect.arrayContaining([
        { scope: 'resource', key: 'service.name', value: 'checkout', contextField: 'serviceName' },
        { scope: 'resource', key: 'nested.child', value: 'flat' },
        { scope: 'resource', key: 'active', value: 'false' },
        { scope: 'resource', key: 'retries', value: '0' }
      ])
    );
    expect(fields.find(field => field.path?.join('/') === 'resource/nested/child')?.filter).toEqual({
      scope: 'resource',
      key: 'nested',
      children: ['child'],
      collection: true,
      value: 'value',
      valueKind: 'string'
    });
    expect(fields.find(field => field.key === 'resource.list')?.filter).toBeUndefined();
    expect(fields.find(field => field.key === 'resource.unsafe')?.filter).toBeDefined();
  });

  it('keeps collection depth and canonical service scope honest', () => {
    const fields = logInspectorFields({
      ...row,
      resource: { 'service.name': ['checkout'] },
      attributes: { tags: [['ready']] }
    });
    expect(fields.find(field => field.path?.join('/') === 'resource/service.name/0')?.filter).toMatchObject({
      key: 'service.name',
      collection: true,
      valueKind: 'string'
    });
    expect(fields.find(field => field.path?.join('/') === 'resource/service.name/0')?.filter).not.toHaveProperty(
      'contextField'
    );
    expect(fields.find(field => field.path?.join('/') === 'attributes/tags/0/0')?.filter).toMatchObject({
      key: 'tags',
      collection: true,
      valueKind: 'unsupported'
    });
  });

  it('adds scalar include/exclude to the draft callback and disables same-field conflicts without overwriting', async () => {
    const onAddLogFilter = vi.fn(() => true);
    const props = {
      id: 'inspector',
      row: { ...row, resource: { region: 'checkout' } },
      selectedIndex: 0,
      rowCount: 1,
      evidenceCurrent: true,
      onSelectIndex: vi.fn(),
      onClose: vi.fn(),
      onAddLogFilter
    };
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector {...props} logFilterDraft={{}} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource.region' }));
    const includeLabel = i18n.t('explore.perses.includeField', { field: 'resource.region' });
    fireEvent.click(await screen.findByRole('menuitem', { name: includeLabel }));
    expect(onAddLogFilter).toHaveBeenLastCalledWith({ scope: 'resource', key: 'region', value: 'checkout' }, '=');
    fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource.region' }));
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: i18n.t('explore.perses.excludeField', { field: 'resource.region' })
      })
    );
    expect(onAddLogFilter).toHaveBeenLastCalledWith({ scope: 'resource', key: 'region', value: 'checkout' }, '!=');
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector {...props} logFilterDraft={{ resourceFilter: 'region = other' }} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource.region' }));
    const include = await screen.findByRole('menuitem', { name: new RegExp(includeLabel) });
    expect(include).toHaveAttribute('aria-disabled', 'true');
    expect(include).toHaveTextContent(i18n.t('explore.perses.editExistingFilter'));
    fireEvent.click(include);
    expect(onAddLogFilter).toHaveBeenCalledTimes(2);
  });

  it('uses native vertical keys for same-page navigation without intercepting fields or menus', async () => {
    const onSelectIndex = vi.fn();
    const onClose = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={{ ...row, resource: { ...row.resource, region: 'checkout' } }}
          selectedIndex={1}
          rowCount={3}
          evidenceCurrent
          onSelectIndex={onSelectIndex}
          onAddLogFilter={() => true}
          onClose={onClose}
        />
      </I18nextProvider>
    );
    const inspector = screen.getByRole('dialog', { name: 'Log details' });
    fireEvent.keyDown(inspector, { key: 'ArrowDown' });
    expect(onSelectIndex).toHaveBeenCalledWith(2);
    fireEvent.keyDown(inspector, { key: 'ArrowUp' });
    expect(onSelectIndex).toHaveBeenLastCalledWith(0);

    const menuTrigger = screen.getByRole('button', { name: 'Field actions: resource.region' });
    fireEvent.click(menuTrigger);
    const menuItem = screen.getByRole('menuitem', {
      name: i18n.t('explore.perses.includeField', { field: 'resource.region' })
    });
    fireEvent.keyDown(menuItem, { key: 'ArrowDown' });
    expect(onSelectIndex).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(menuItem, { key: 'Escape' });
    await waitFor(() => expect(menuTrigger).toHaveAttribute('aria-expanded', 'false'));
    expect(onClose).not.toHaveBeenCalled();

    const search = screen.getByRole('textbox', { name: 'Search fields in this log' });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(onSelectIndex).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape and lets the selection owner restore focus to the unchanged result row', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Selected log row';
    document.body.append(trigger);
    const onClose = vi.fn(() => trigger.focus());
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={row}
          selectedIndex={0}
          rowCount={1}
          evidenceCurrent
          onSelectIndex={vi.fn()}
          onClose={onClose}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    view.unmount();
    trigger.remove();
  });

  it('uses real Ant Design tabs and associates each tab with one panel', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={row}
          selectedIndex={0}
          rowCount={1}
          evidenceCurrent
          onSelectIndex={vi.fn()}
          onClose={vi.fn()}
        />
      </I18nextProvider>
    );
    const fields = screen.getByRole('tab', { name: 'Fields' });
    expect(screen.getByRole('tablist').closest('.ant-tabs')).toBeInTheDocument();
    const json = screen.getByRole('tab', { name: 'JSON' });
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(fields).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    fields.focus();
    fireEvent.keyDown(fields, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(json).toHaveFocus();
    expect(fields).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(json, { key: 'Enter', code: 'Enter' });
    expect(json).toHaveAttribute('aria-selected', 'true');
    expect(json).toHaveAttribute('tabindex', '0');
    expect(fields).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(json).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    fireEvent.keyDown(json, { key: 'Home', code: 'Home' });
    expect(fields).toHaveFocus();
    fireEvent.keyDown(fields, { key: 'Enter', code: 'Enter' });
    expect(fields).toHaveAttribute('aria-selected', 'true');
  });

  it('does not schedule a copy announcement after its owner unmounts', async () => {
    vi.useFakeTimers();
    let resolveCopy!: () => void;
    writeText.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveCopy = resolve;
        })
    );
    const view = renderHook(() => useEvidenceCopy('log evidence'));
    const copy = view.result.current.copy();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('log evidence');
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
    resolveCopy();
    await copy;
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('bounds copy announcements and does not leave stale success text in the accessibility tree', async () => {
    vi.useFakeTimers();
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={row}
          selectedIndex={0}
          rowCount={1}
          evidenceCurrent
          onSelectIndex={vi.fn()}
          onClose={vi.fn()}
        />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy log' }));
    await act(async () => Promise.resolve());
    expect(screen.getByRole('status', { name: 'Copy status' })).toHaveTextContent('Log copied');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByRole('status', { name: 'Copy status' })).toBeEmptyDOMElement();
    vi.useRealTimers();
  });

  it('keeps unavailable actions disabled for stale evidence or missing identifiers', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={{ ...row, logRecordUid: null, traceId: null }}
          selectedIndex={0}
          rowCount={1}
          evidenceCurrent={false}
          onSelectIndex={vi.fn()}
          onClose={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('button', { name: 'Previous log' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next log' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Investigate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open trace' })).toBeDisabled();
  });

  it('announces a localized failure when copying is unavailable', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard unavailable'));
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogInspector
          id="log-inspector"
          row={row}
          selectedIndex={0}
          rowCount={1}
          evidenceCurrent
          onSelectIndex={vi.fn()}
          onClose={vi.fn()}
        />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy log' }));

    expect(await screen.findByText('Log could not be copied')).toHaveAttribute('aria-live', 'polite');
  });
});

const row: LogRow = {
  logRecordUid: 'record-1',
  timeUnixNano: '1750000000000000000',
  observedTimeUnixNano: '1750000000100000000',
  severityNumber: 9,
  severityText: 'INFO',
  body: 'checkout timeout',
  attributes: { 'http.status_code': 504 },
  droppedAttributesCount: 0,
  traceId: '0123456789abcdef0123456789abcdef',
  spanId: '0123456789abcdef',
  traceFlags: 1,
  resource: { 'service.name': 'checkout' },
  resourceSchemaUrl: null,
  instrumentationScope: { name: 'io.opentelemetry', version: '1.0.0', attributes: null, droppedAttributesCount: 0 },
  scopeSchemaUrl: null
};
