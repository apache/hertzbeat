/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';

import {
  api,
  auth,
  deferred,
  detail,
  observedNavigate,
  renderControllerAt,
  resetMonitorDefinitionControllerFixture,
  route,
  updateWorkspace
} from './use-monitor-definition-controller-test-support';

describe('useMonitorDefinitionController routing', () => {
  beforeEach(resetMonitorDefinitionControllerFixture);

  it('retires an old detail when browser navigation changes app and closes on app removal', async () => {
    const mysql = deferred<typeof detail>();
    const jvmDetail = { ...detail, app: 'jvm', label: 'JVM' };
    let mysqlCalls = 0;
    api.detail.mockImplementation((app: string) => {
      if (app === 'mysql' && mysqlCalls++ === 0) return mysql.promise;
      return Promise.resolve(app === 'jvm' ? jvmDetail : detail);
    });
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'loading', mode: 'edit', app: 'mysql' }));

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?scope=all&app=jvm');
    });
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(jvmDetail)));
    mysql.resolve(detail);
    await act(async () => mysql.promise);
    expect(view.result.current.workspace).toEqual(updateWorkspace(jvmDetail));

    act(() => {
      void observedNavigate()(-1);
    });
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));
    act(() => {
      void observedNavigate()(1);
    });
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(jvmDetail)));

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?scope=all');
    });
    await waitFor(() => expect(view.result.current.workspace).toBeNull());
    expect(route.search).toBe('?scope=all');
    expect(api.detail).toHaveBeenCalledTimes(4);
  });

  it('syncs explicit view and edit identity to the URL while keeping mode interaction-owned', async () => {
    const view = renderControllerAt('/settings/monitor-definitions?scope=all');
    await act(() => view.result.current.actions.openView('mysql'));
    await waitFor(() => expect(route.search).toBe('?scope=all&app=mysql'));
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });

    await act(() => view.result.current.actions.openEdit('mysql'));
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', draft: { expectedApp: 'mysql' } });
    expect(route.search).toBe('?scope=all&app=mysql');

    act(() => view.result.current.actions.closeWorkspace());
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(view.result.current.workspace).toBeNull();
  });

  it('restores a dirty editor route when navigation is attempted during an exclusive command', async () => {
    const validation = deferred<{ schemaVersion: 1; valid: true; app: string; origin: 'override' }>();
    const jvmDetail = { ...detail, app: 'jvm', label: 'JVM' };
    api.validate.mockReturnValueOnce(validation.promise);
    api.detail.mockImplementation((app: string) => Promise.resolve(app === 'jvm' ? jvmDetail : detail));
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: local'));
    let command!: Promise<void>;
    act(() => {
      command = view.result.current.actions.validate();
    });
    await waitFor(() => expect(api.validate).toHaveBeenCalledOnce());

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?app=jvm');
    });
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', pending: 'validate' });
    expect(api.detail).toHaveBeenCalledTimes(2);
    validation.resolve({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });
    await act(async () => command);

    await waitFor(() => expect(route.search).toBe('?app=mysql'));
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      authority: detail,
      draft: { definition: 'app: mysql\nname: local' }
    });
    expect(api.detail).toHaveBeenCalledTimes(2);
  });

  it('holds an uncertain write recovery across route changes until explicit cancel', async () => {
    const jvmDetail = { ...detail, app: 'jvm', label: 'JVM' };
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
    api.detail.mockImplementation((app: string) => Promise.resolve(app === 'jvm' ? jvmDetail : detail));
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: uncertain'));
    await act(() => view.result.current.actions.save());
    await waitFor(() =>
      expect(view.result.current.workspace).toMatchObject({ kind: 'edit', writeRecovery: 'uncertain' })
    );

    act(() => {
      void observedNavigate()('/settings/monitor-definitions?app=jvm');
    });
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { expectedApp: 'mysql' },
      writeRecovery: 'uncertain'
    });
    expect(api.detail).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(route.search).toBe('?app=mysql'));

    act(() => view.result.current.actions.cancelEdit());
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));
    expect(route.search).toBe('?app=mysql');
  });

  it('does not change route identity when an explicit open is rejected by a pending command', async () => {
    const write = deferred<typeof detail>();
    const createdDetail = { ...detail, app: 'custom', label: 'Custom', definition: 'app: custom' };
    api.create.mockReturnValueOnce(write.promise);
    api.detail.mockImplementation((app: string) => Promise.resolve(app === 'custom' ? createdDetail : detail));
    const view = renderControllerAt('/settings/monitor-definitions?scope=all');
    act(() => view.result.current.actions.openCreate());
    act(() => view.result.current.actions.setDefinition('app: custom'));
    let saving!: Promise<void>;
    act(() => {
      saving = view.result.current.actions.save();
    });
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());

    await act(() => view.result.current.actions.openView('mysql'));
    expect(route.search).toBe('?scope=all');
    expect(view.result.current.workspace).toMatchObject({ kind: 'edit', pending: 'save' });
    expect(api.detail).not.toHaveBeenCalled();

    write.resolve(createdDetail);
    await act(async () => saving);
    await waitFor(() => expect(route.search).toBe('?scope=all&app=custom'));
    expect(view.result.current.workspace).toEqual(updateWorkspace(createdDetail));
  });

  it('does not replace uncertain write evidence through an explicit open action', async () => {
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('state-uncertain', 'uncertain'));
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));
    await act(() => view.result.current.actions.openEdit('mysql'));
    act(() => view.result.current.actions.setDefinition('app: mysql\nname: uncertain'));
    await act(() => view.result.current.actions.save());
    await waitFor(() =>
      expect(view.result.current.workspace).toMatchObject({ kind: 'edit', writeRecovery: 'uncertain' })
    );
    const detailCalls = api.detail.mock.calls.length;

    await act(() => view.result.current.actions.openView('jvm'));

    expect(route.search).toBe('?app=mysql');
    expect(api.detail).toHaveBeenCalledTimes(detailCalls);
    expect(view.result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { expectedApp: 'mysql' },
      writeRecovery: 'uncertain'
    });
  });

  it('keeps a reader deep link when a forbidden create action is rejected', async () => {
    auth.roles = ['USER'];
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));

    act(() => view.result.current.actions.openCreate());

    expect(route.search).toBe('?scope=all&app=mysql');
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
  });

  it('replaces the current history entry when an explicit close removes app identity', async () => {
    const view = renderControllerAt('/settings/monitor-definitions?scope=all&app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));

    act(() => view.result.current.actions.closeWorkspace());
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    act(() => {
      void observedNavigate()(-1);
    });

    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(view.result.current.workspace).toBeNull();
  });

  it('canonicalizes blank and unsafe app values without requesting detail', async () => {
    const unsafe = encodeURIComponent(`mysql${String.fromCharCode(0)}`);
    const blank = renderControllerAt('/settings/monitor-definitions?scope=all&app=%20%20');
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(api.detail).not.toHaveBeenCalled();
    blank.unmount();

    const invalid = renderControllerAt(`/settings/monitor-definitions?scope=all&app=${unsafe}`);
    await waitFor(() => expect(route.search).toBe('?scope=all'));
    expect(api.detail).not.toHaveBeenCalled();
    invalid.unmount();
  });

  it('restores only a view after ADMIN loss and never resurrects retired edit state after ADMIN gain', async () => {
    const view = renderControllerAt('/settings/monitor-definitions?app=mysql');
    await waitFor(() => expect(view.result.current.workspace).toEqual(updateWorkspace(detail)));

    auth.roles = ['USER'];
    view.rerender();
    await waitFor(() => expect(view.result.current.workspace).toEqual({ kind: 'view', detail }));
    auth.roles = ['ADMIN'];
    view.rerender();
    await waitFor(() => expect(view.result.current.canWrite).toBe(true));
    expect(view.result.current.workspace).toEqual({ kind: 'view', detail });
  });
});
