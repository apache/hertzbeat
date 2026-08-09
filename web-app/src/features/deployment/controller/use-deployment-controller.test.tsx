/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  activate: vi.fn(),
  export: vi.fn(),
  loadDeployment: vi.fn(),
  loadMigration: vi.fn(),
  start: vi.fn(),
  validate: vi.fn()
}));
vi.mock('../api/deployment-api', async () => ({
  ...(await vi.importActual<typeof import('../api/deployment-api')>('../api/deployment-api')),
  activateMigration: api.activate,
  exportMigration: api.export,
  loadDeployment: api.loadDeployment,
  loadMigration: api.loadMigration,
  startMigration: api.start,
  validateMigration: api.validate
}));
const download = vi.hoisted(() => ({ artifact: vi.fn() }));
vi.mock('./deployment-download', () => ({ downloadDeploymentExport: download.artifact }));

import { DeploymentRequestError } from '../api/deployment-api';
import type { MigrationExportRequest, MigrationView } from '../model/deployment-contract';
import { deploymentQueryKeys } from './deployment-query-keys';
import { useDeploymentController } from './use-deployment-controller';

describe('useDeploymentController lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadDeployment.mockResolvedValue(deploymentFixture());
    api.loadMigration.mockResolvedValue(migrationFixture('ready_to_activate'));
    api.validate.mockResolvedValue(validationFixture());
    api.activate.mockResolvedValue(migrationFixture('awaiting_restart'));
    api.start.mockResolvedValue(migrationFixture('ready_to_activate'));
    api.export.mockResolvedValue(attachmentFixture());
  });

  afterEach(() => vi.useRealTimers());

  it('recovers polling from a refresh URL and canonicalizes invalid URL state without a request', async () => {
    const recovered = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(recovered.current.operation?.operationId).toBe('migration-1'));
    expect(api.loadMigration).toHaveBeenCalledWith('migration-1', expect.any(AbortSignal));
    recovered.unmount();

    api.loadMigration.mockClear();
    const invalid = renderController('/settings/deployment?operationId=../../private&password=secret');
    await waitFor(() => expect(invalid.router.state.location.search).toBe(''));
    expect(api.loadMigration).not.toHaveBeenCalled();
    invalid.unmount();
  });

  it('discovers an authoritative active operation and continues it through the canonical URL', async () => {
    api.loadDeployment.mockResolvedValue({
      ...deploymentFixture(),
      migration: {
        allowed: false,
        blockedBy: 'operation_conflict',
        maintenanceAdmission: 'unavailable',
        activeOperationId: 'migration-current'
      }
    });
    api.loadMigration.mockResolvedValue({ ...migrationFixture('running'), operationId: 'migration-current' });
    const view = renderController();
    await waitFor(() => expect(view.current.deployment?.migration.activeOperationId).toBe('migration-current'));
    act(() => {
      view.current.updateDraft({
        target: 'mysql',
        targetDatabase: {
          kind: 'mysql',
          jdbcUrl: 'jdbc:mysql://db/hertzbeat',
          username: 'hertzbeat',
          password: 'draft-secret'
        },
        applyMode: 'managed_write'
      });
      view.current.updateExportPassword('one-shot-secret');
    });

    act(() => {
      void view.current.continueCurrentMigration();
    });

    await waitFor(() => expect(view.router.state.location.search).toBe('?operationId=migration-current'));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('migration-current'));
    expect(view.current.draft.targetDatabase).toEqual({ kind: 'mysql', jdbcUrl: '', username: '', password: '' });
    expect(view.current.exportPassword).toBe('');
    view.unmount();
  });

  it('follows back and forward operation identities as the sole polling authority', async () => {
    api.loadMigration.mockImplementation(operationId =>
      Promise.resolve({ ...migrationFixture('ready_to_activate'), operationId })
    );
    const view = renderController('/settings/deployment?operationId=operation-b', [
      '/settings/deployment?operationId=operation-a',
      '/settings/deployment?operationId=operation-b'
    ]);
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-b'));

    await act(() => view.router.navigate(-1));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-a'));
    await act(() => view.router.navigate(1));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-b'));
    const loadCalls = api.loadMigration.mock.calls as unknown as Array<[string, AbortSignal]>;
    expect(loadCalls.map(([identity]) => identity)).toEqual(expect.arrayContaining(['operation-a', 'operation-b']));
    view.unmount();
  });

  it('retires a pending start when navigation selects another operation identity', async () => {
    const pending = deferred<MigrationView>();
    let startSignal: AbortSignal | undefined;
    api.start.mockImplementation((_request, signal) => {
      startSignal = signal;
      return pending.promise;
    });
    api.loadMigration.mockImplementation(operationId =>
      Promise.resolve({ ...migrationFixture('awaiting_external_apply'), operationId })
    );
    const view = renderController('/settings/deployment', [
      '/settings/deployment?operationId=operation-a',
      '/settings/deployment'
    ]);
    await makeStartReady(view);
    act(() => void view.current.start());
    await waitFor(() => expect(startSignal).toBeDefined());

    await act(() => view.router.navigate(-1));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-a'));
    expect(startSignal?.aborted).toBe(true);
    expect(view.current.busy).toBe(false);
    act(() => {
      view.current.updateDraft(externalDraft('new'));
      view.current.updateExportPassword('new-secret');
    });

    pending.resolve(migrationFixture('ready_to_activate', { operationId: 'stale-start' }));
    await act(async () => void (await pending.promise));

    expect(view.router.state.location.search).toBe('?operationId=operation-a');
    expect(view.current.operation?.operationId).toBe('operation-a');
    expect(view.current.exportPassword).toBe('new-secret');
    view.unmount();
  });

  it('retires a pending activation without writing stale operation cache', async () => {
    const pending = deferred<MigrationView>();
    let activateSignal: AbortSignal | undefined;
    api.activate.mockImplementation((_operationId, _request, signal) => {
      activateSignal = signal;
      return pending.promise;
    });
    api.loadMigration.mockImplementation(operationId =>
      Promise.resolve({ ...migrationFixture('ready_to_activate'), operationId })
    );
    const view = renderController('/settings/deployment?operationId=operation-a', [
      '/settings/deployment?operationId=operation-b',
      '/settings/deployment?operationId=operation-a'
    ]);
    await waitFor(() => expect(view.current.canActivate).toBe(true));
    act(() => void view.current.activate());
    await waitFor(() => expect(activateSignal).toBeDefined());

    await act(() => view.router.navigate(-1));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-b'));
    expect(activateSignal?.aborted).toBe(true);
    expect(view.current.busy).toBe(false);

    pending.resolve(migrationFixture('awaiting_restart', { operationId: 'operation-a' }));
    await act(async () => void (await pending.promise));

    expect(view.current.operation?.operationId).toBe('operation-b');
    expect(view.client.getQueryData(deploymentQueryKeys.migration('operation-a'))).not.toMatchObject({
      state: 'awaiting_restart'
    });
    view.unmount();
  });

  it('does not resurrect an old A admission after navigating A to B to A', async () => {
    const oldA = deferred<MigrationView>();
    const newA = deferred<MigrationView>();
    let oldSignal: AbortSignal | undefined;
    api.activate
      .mockImplementationOnce((_operationId, _request, signal) => {
        oldSignal = signal;
        return oldA.promise;
      })
      .mockImplementationOnce(() => newA.promise);
    api.loadMigration.mockImplementation(operationId =>
      Promise.resolve({ ...migrationFixture('ready_to_activate'), operationId })
    );
    const view = renderController('/settings/deployment?operationId=operation-a');
    await waitFor(() => expect(view.current.canActivate).toBe(true));
    act(() => void view.current.activate());
    await waitFor(() => expect(oldSignal).toBeDefined());

    await act(() => view.router.navigate('/settings/deployment?operationId=operation-b'));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-b'));
    expect(oldSignal?.aborted).toBe(true);
    await act(() => view.router.navigate('/settings/deployment?operationId=operation-a'));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-a'));

    expect(view.current.busyAction).toBeNull();
    expect(view.current.canActivate).toBe(true);
    act(() => void view.current.activate());
    expect(api.activate).toHaveBeenCalledTimes(2);
    expect(view.current.busyAction).toBe('activate');

    oldA.resolve(migrationFixture('awaiting_restart', { operationId: 'operation-a' }));
    await act(async () => void (await oldA.promise));
    expect(view.current.busyAction).toBe('activate');

    const deploymentReads = api.loadDeployment.mock.calls.length;
    newA.resolve(migrationFixture('awaiting_restart', { operationId: 'operation-a' }));
    await waitFor(() => expect(view.current.busyAction).toBeNull());
    await waitFor(() => expect(api.loadDeployment.mock.calls.length).toBeGreaterThan(deploymentReads));
    view.unmount();
  });

  it('retires a pending export without downloading or clearing the next operation secret', async () => {
    const pending = deferred<Awaited<ReturnType<typeof api.export>>>();
    let exportSignal: AbortSignal | undefined;
    api.export.mockImplementation((_operationId, _request, signal) => {
      exportSignal = signal;
      return pending.promise;
    });
    api.loadMigration.mockImplementation(operationId =>
      Promise.resolve({ ...migrationFixture('awaiting_external_apply'), operationId })
    );
    const view = renderController('/settings/deployment?operationId=operation-a', [
      '/settings/deployment?operationId=operation-b',
      '/settings/deployment?operationId=operation-a'
    ]);
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-a'));
    act(() => {
      view.current.updateDraft(externalDraft('old'));
      view.current.updateExportPassword('old-secret');
    });
    await waitFor(() => expect(view.current.canExport).toBe(true));
    act(() => void view.current.exportConfiguration());
    await waitFor(() => expect(exportSignal).toBeDefined());

    await act(() => view.router.navigate(-1));
    await waitFor(() => expect(view.current.operation?.operationId).toBe('operation-b'));
    expect(exportSignal?.aborted).toBe(true);
    act(() => {
      view.current.updateDraft(externalDraft('new'));
      view.current.updateExportPassword('new-secret');
    });

    pending.resolve(attachmentFixture());
    await act(async () => void (await pending.promise));

    expect(download.artifact).not.toHaveBeenCalled();
    expect(view.current.exportPassword).toBe('new-secret');
    view.unmount();
  });

  it('uses the server poll delay and stops after a terminal operation', async () => {
    api.loadMigration
      .mockResolvedValueOnce(migrationFixture('running', { nextPollAfterMillis: 10 }))
      .mockResolvedValueOnce(migrationFixture('succeeded'));
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(api.loadMigration).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 75));
    expect(api.loadMigration).toHaveBeenCalledTimes(2);
    expect(api.loadDeployment.mock.calls.length).toBeGreaterThan(1);
    view.unmount();
  });

  it('admits a rapid start only once, replaces the URL, and retires the draft password for external apply', async () => {
    const pending = deferred<MigrationView>();
    api.start.mockReturnValue(pending.promise);
    const view = renderController();
    await makeStartReady(view);

    act(() => {
      void view.current.start();
      void view.current.start();
    });
    expect(api.start).toHaveBeenCalledOnce();
    expect(view.current.busyAction).toBe('start');
    pending.resolve(migrationFixture('awaiting_external_apply'));
    await waitFor(() => expect(view.router.state.location.search).toBe('?operationId=migration-1'));
    expect(view.current.busyAction).toBeNull();
    expect(view.current.draft.targetDatabase).toEqual({ kind: 'mysql', jdbcUrl: '', username: '', password: '' });
    view.unmount();
  });

  it('does not admit start from an impossible valid result that also contains an error', async () => {
    api.validate.mockResolvedValue({
      valid: true,
      observedAt: '2026-08-09T01:00:00Z',
      errorCode: 'metadata_connection_failed',
      warnings: []
    });
    const view = renderController();
    await waitFor(() => expect(view.current.deployment).not.toBeNull());
    act(() => view.current.updateDraft(externalDraft('draft')));
    await act(() => view.current.validate());
    act(() => view.current.setMaintenanceAcknowledged(true));

    expect(view.current.canStart).toBe(false);
    view.unmount();
  });

  it('aborts an unfinished start on unmount and never admits a second write', async () => {
    const pending = deferred<MigrationView>();
    let startSignal: AbortSignal | undefined;
    api.start.mockImplementation((_request, signal) => {
      startSignal = signal;
      return pending.promise;
    });
    const view = renderController();
    await makeStartReady(view);
    act(() => void view.current.start());
    await waitFor(() => expect(startSignal).toBeDefined());

    view.unmount();

    expect(startSignal?.aborted).toBe(true);
    pending.resolve(migrationFixture('ready_to_activate'));
  });

  it('retains a locally rejected start password but retires it when receipt is uncertain', async () => {
    api.start.mockRejectedValueOnce(new DeploymentRequestError('http', 409, 'invalid_request'));
    const rejected = renderController();
    await makeStartReady(rejected);
    await act(() => rejected.current.start());
    expect(rejected.current.draft.targetDatabase.password).toBe('draft-secret');
    expect(rejected.current.commandErrorKey).toBe('deployment.errors.invalid_request');
    rejected.unmount();

    api.start.mockRejectedValueOnce(new DeploymentRequestError('unavailable'));
    const uncertain = renderController();
    await makeStartReady(uncertain);
    await act(() => uncertain.current.start());
    expect(uncertain.current.draft.targetDatabase.password).toBe('');
    uncertain.unmount();
  });

  it('refetches deployment authority after a start conflict and exposes the discovered operation', async () => {
    api.start.mockRejectedValueOnce(new DeploymentRequestError('http', 409, 'operation_conflict'));
    const view = renderController();
    await makeStartReady(view);
    api.loadDeployment.mockResolvedValue({
      ...deploymentFixture(),
      migration: {
        allowed: false,
        blockedBy: 'operation_conflict',
        maintenanceAdmission: 'unavailable',
        activeOperationId: 'migration-current'
      }
    });

    await act(() => view.current.start());

    await waitFor(() => expect(view.current.deployment?.migration.activeOperationId).toBe('migration-current'));
    expect(view.current.draft.targetDatabase.password).toBe('draft-secret');
    view.unmount();
  });

  it('keeps export credentials one-shot, supports all formats, and keeps activation mutually exclusive', async () => {
    api.loadMigration.mockResolvedValue(migrationFixture('awaiting_external_apply', { target: 'postgresql' }));
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(view.current.operation?.state).toBe('awaiting_external_apply'));
    expect(view.current.canActivate).toBe(false);
    act(() =>
      view.current.updateDraft({
        target: 'postgresql',
        targetDatabase: {
          kind: 'postgresql',
          jdbcUrl: 'jdbc:postgresql://db/hertzbeat',
          username: 'hertzbeat',
          password: ''
        },
        applyMode: 'external_apply'
      })
    );
    act(() => view.current.updateExportPassword('one-shot-secret'));

    for (const format of ['yaml', 'env', 'kubernetes_secret'] as const) {
      act(() => view.current.updateExportFormat(format));
      if (format !== 'yaml') act(() => view.current.updateExportPassword('one-shot-secret'));
      await act(() => view.current.exportConfiguration());
    }

    const exportCalls = api.export.mock.calls as unknown as Array<[string, MigrationExportRequest, AbortSignal]>;
    expect(exportCalls.map(([, request]) => request.format)).toEqual(['yaml', 'env', 'kubernetes_secret']);
    expect(exportCalls.every(([, request]) => request.targetDatabase.kind === 'postgresql')).toBe(true);
    expect(api.export).toHaveBeenLastCalledWith(
      'migration-1',
      expect.objectContaining({
        format: 'kubernetes_secret',
        targetDatabase: {
          kind: 'postgresql',
          jdbcUrl: 'jdbc:postgresql://db/hertzbeat',
          username: 'hertzbeat',
          password: 'one-shot-secret'
        }
      }),
      expect.any(AbortSignal)
    );
    expect(view.current.exportPassword).toBe('');
    expect(download.artifact).toHaveBeenCalledTimes(3);
    view.unmount();
  });

  it('single-flights export and retires its one-shot password when the receipt is uncertain', async () => {
    api.loadMigration.mockResolvedValue(migrationFixture('awaiting_external_apply'));
    const pending = deferred<Awaited<ReturnType<typeof api.export>>>();
    api.export.mockReturnValue(pending.promise);
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(view.current.operation?.state).toBe('awaiting_external_apply'));
    act(() => {
      view.current.updateDraft({
        target: 'mysql',
        targetDatabase: { kind: 'mysql', jdbcUrl: 'jdbc:mysql://db/hertzbeat', username: 'hertzbeat', password: '' },
        applyMode: 'external_apply'
      });
      view.current.updateExportPassword('one-shot-secret');
    });
    await waitFor(() => expect(view.current.canExport).toBe(true));

    act(() => {
      void view.current.exportConfiguration();
      void view.current.exportConfiguration();
    });
    expect(api.export).toHaveBeenCalledOnce();
    pending.reject(new DeploymentRequestError('unavailable'));
    await waitFor(() => expect(view.current.exportPassword).toBe(''));
    expect(view.current.commandErrorKey).toBe('deployment.unavailable');
    view.unmount();
  });

  it('retires the one-shot export password after a definite server rejection', async () => {
    api.loadMigration.mockResolvedValue(migrationFixture('awaiting_external_apply'));
    api.export.mockRejectedValueOnce(new DeploymentRequestError('http', 409, 'invalid_request'));
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(view.current.operation?.state).toBe('awaiting_external_apply'));
    act(() => {
      view.current.updateDraft({
        target: 'mysql',
        targetDatabase: { kind: 'mysql', jdbcUrl: 'jdbc:mysql://db/hertzbeat', username: 'hertzbeat', password: '' },
        applyMode: 'external_apply'
      });
      view.current.updateExportPassword('one-shot-secret');
    });
    await waitFor(() => expect(view.current.canExport).toBe(true));

    await act(() => view.current.exportConfiguration());

    expect(view.current.exportPassword).toBe('');
    expect(view.current.commandErrorKey).toBe('deployment.errors.invalid_request');
    view.unmount();
  });

  it('clears missing and terminal operations, secrets, validation, and canonical query before refetching deployment', async () => {
    api.loadMigration.mockRejectedValue(new DeploymentRequestError('http', 404, 'operation_not_found'));
    const missing = renderController('/settings/deployment?operationId=missing-operation');
    await waitFor(() => expect(missing.router.state.location.search).toBe(''));
    expect(api.loadDeployment.mock.calls.length).toBeGreaterThan(1);
    missing.unmount();

    api.loadMigration.mockResolvedValue(migrationFixture('failed'));
    const terminal = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(terminal.current.operation?.state).toBe('failed'));
    act(() => terminal.current.updateExportPassword('one-shot-secret'));
    await act(() => terminal.current.startNewMigration());
    expect(terminal.router.state.location.search).toBe('');
    expect(terminal.current.validation).toBeNull();
    expect(terminal.current.exportPassword).toBe('');
    expect(terminal.current.draft.targetDatabase.password).toBe('');
    terminal.unmount();
  });

  it('clears a completed operation identity when returning to authoritative configuration', async () => {
    api.loadMigration.mockResolvedValue(migrationFixture('succeeded'));
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(view.current.operation?.state).toBe('succeeded'));
    const reads = api.loadDeployment.mock.calls.length;

    await act(() => view.current.startNewMigration());

    expect(view.router.state.location.search).toBe('');
    await waitFor(() => expect(api.loadDeployment.mock.calls.length).toBeGreaterThan(reads));
    view.unmount();
  });

  it('invalidates deployment after activation and exposes failures without stale success', async () => {
    api.loadMigration.mockResolvedValue(migrationFixture('ready_to_activate'));
    api.activate.mockRejectedValueOnce(new DeploymentRequestError('http', 409, 'migration_activation_failed'));
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(view.current.canActivate).toBe(true));
    const reads = api.loadDeployment.mock.calls.length;

    await act(() => view.current.activate());

    expect(view.current.commandErrorKey).toBe('deployment.errors.migration_activation_failed');
    expect(api.loadDeployment.mock.calls.length).toBe(reads);
    view.unmount();
  });

  it('refetches the deployment summary after accepted activation', async () => {
    api.loadMigration.mockResolvedValue(migrationFixture('ready_to_activate'));
    const view = renderController('/settings/deployment?operationId=migration-1');
    await waitFor(() => expect(view.current.canActivate).toBe(true));
    const reads = api.loadDeployment.mock.calls.length;

    await act(() => view.current.activate());

    await waitFor(() => expect(api.loadDeployment.mock.calls.length).toBeGreaterThan(reads));
    expect(view.current.operation?.state).toBe('awaiting_restart');
    view.unmount();
  });
});

type RenderedController = ReturnType<typeof renderController>;

async function makeStartReady(view: RenderedController) {
  await waitFor(() => expect(view.current.deployment).not.toBeNull());
  act(() =>
    view.current.updateDraft({
      target: 'mysql',
      targetDatabase: {
        kind: 'mysql',
        jdbcUrl: 'jdbc:mysql://db/hertzbeat',
        username: 'hertzbeat',
        password: 'draft-secret'
      },
      applyMode: 'external_apply'
    })
  );
  await act(() => view.current.validate());
  act(() => view.current.setMaintenanceAcknowledged(true));
  await waitFor(() => expect(view.current.canStart).toBe(true));
}

function renderController(entry = '/settings/deployment', entries?: string[]) {
  let current: ReturnType<typeof useDeploymentController> | undefined;
  function Probe() {
    current = useDeploymentController();
    return null;
  }
  const initialEntries = entries ?? [entry];
  const router = createMemoryRouter([{ path: '/settings/deployment', element: <Probe /> }], {
    initialEntries,
    initialIndex: initialEntries.length - 1
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const rendered = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return {
    get current() {
      if (!current) throw new Error('Controller did not render');
      return current;
    },
    router,
    client,
    unmount: rendered.unmount
  };
}

function deploymentFixture() {
  return {
    observedAt: '2026-08-09T01:00:00Z',
    managementDatabase: {
      kind: 'h2' as const,
      configured: true,
      source: 'ui_managed' as const,
      restartRequired: false
    },
    greptimeDatabase: {
      kind: 'greptime' as const,
      configured: true,
      source: 'environment' as const,
      restartRequired: false
    },
    applyMode: 'managed_write' as const,
    maintenanceMode: 'active' as const,
    topology: 'single_node' as const,
    migration: {
      allowed: true,
      blockedBy: null,
      maintenanceAdmission: 'use_current' as const,
      activeOperationId: null
    }
  };
}

function validationFixture() {
  return { valid: true, observedAt: '2026-08-09T01:00:00Z', errorCode: null, warnings: [] };
}

function migrationFixture(state: MigrationView['state'], overrides: Partial<MigrationView> = {}): MigrationView {
  const stateFields: Record<MigrationView['state'], Partial<MigrationView>> = {
    pending: {
      stage: 'queued',
      progressPercent: 0,
      startedAt: null,
      verificationState: 'pending',
      nextPollAfterMillis: 25
    },
    running: { stage: 'copying', progressPercent: 50, verificationState: 'pending', nextPollAfterMillis: 25 },
    ready_to_activate: { stage: 'ready_to_activate', activationAvailable: true },
    awaiting_external_apply: { stage: 'awaiting_external_apply', externalApplyRequired: true },
    awaiting_restart: { stage: 'awaiting_restart', restartRequired: true, nextPollAfterMillis: 25 },
    succeeded: { stage: 'completed', completedAt: '2026-08-09T01:01:00Z' },
    failed: { stage: 'failed', completedAt: '2026-08-09T01:01:00Z', errorCode: 'migration_copy_failed' },
    rolled_back: { stage: 'rolled_back', completedAt: '2026-08-09T01:01:00Z', errorCode: 'migration_copy_failed' }
  };
  return {
    operationId: 'migration-1',
    state,
    source: 'h2',
    target: 'mysql',
    stage: 'ready_to_activate',
    progressPercent: 100,
    createdAt: '2026-08-09T01:00:00Z',
    startedAt: '2026-08-09T01:00:01Z',
    completedAt: null,
    verificationState: 'succeeded',
    errorCode: null,
    nextPollAfterMillis: 0,
    activationAvailable: false,
    restartRequired: false,
    externalApplyRequired: false,
    ...stateFields[state],
    ...overrides
  };
}

function attachmentFixture() {
  return { blob: new Blob(['opaque']), fileName: 'deployment.yml', mediaType: 'application/yaml' };
}

function externalDraft(identity: string) {
  return {
    target: 'mysql' as const,
    targetDatabase: {
      kind: 'mysql' as const,
      jdbcUrl: `jdbc:mysql://db/${identity}`,
      username: identity,
      password: `${identity}-draft-secret`
    },
    applyMode: 'external_apply' as const
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}
