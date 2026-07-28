/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  previewedEntityDefinition,
  resetEntityDefinitionDraft,
  type EntityDefinitionDraft
} from '../model/entity-definition-model';
import { initialEntityImportDraft, previewedEntityImport } from '../model/entity-import-model';
import {
  createDefinitionPreviewAction,
  createDefinitionRefreshAction,
  createDefinitionSaveAction
} from './entity-definition-editing-commands';
import {
  initialEntityDefinitionEditingSession,
  retireEntityDefinitionEditing,
  type EntityDefinitionEditingRuntime
} from './entity-definition-editing-state';
import {
  runEntityImportConfirmation,
  runEntityImportPreview,
  type EntityImportRuntime
} from './entity-import-commands';

const definitionApi = vi.hoisted(() => ({
  previewEntityDefinition: vi.fn(),
  saveEntityDefinition: vi.fn()
}));
const importApi = vi.hoisted(() => ({
  previewEntityDefinitionBundle: vi.fn(),
  commitEntityDefinitionBundle: vi.fn()
}));
vi.mock('../api/entity-definition-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-definition-api')>()),
  ...definitionApi
}));
vi.mock('../api/entity-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-import-api')>()),
  ...importApi
}));

const resource = {
  entity: { id: 7, type: 'service', name: 'checkout' },
  identities: [],
  monitorBinds: [],
  relations: []
};

describe('entity command generation locks', () => {
  it('keeps a new definition preview locked when the retired preview settles late', async () => {
    const oldPreview = deferred<typeof resource>();
    const newPreview = deferred<typeof resource>();
    definitionApi.previewEntityDefinition
      .mockReturnValueOnce(oldPreview.promise)
      .mockReturnValueOnce(newPreview.promise);
    const harness = definitionHarness(definitionDraft('kind: old'));

    createDefinitionPreviewAction(harness.runtime)();
    expect(definitionApi.previewEntityDefinition).toHaveBeenCalledTimes(1);
    harness.loseAccess();
    harness.regainAccess(definitionDraft('kind: new'));
    createDefinitionPreviewAction(harness.runtime)();
    expect(definitionApi.previewEntityDefinition).toHaveBeenCalledTimes(2);

    oldPreview.resolve(resource);
    await flushPromises();
    createDefinitionPreviewAction(harness.runtime)();
    expect(definitionApi.previewEntityDefinition).toHaveBeenCalledTimes(2);

    newPreview.resolve(resource);
    await flushPromises();
  });

  it('keeps a new definition save locked when the retired readback settles late', async () => {
    const oldReadback = deferred<void>();
    const newReadback = deferred<void>();
    definitionApi.saveEntityDefinition.mockResolvedValue(undefined);
    const harness = definitionHarness(saveableDefinitionDraft('kind: old'), [oldReadback.promise, newReadback.promise]);

    createDefinitionSaveAction(harness.runtime)();
    await expectCallCount(definitionApi.saveEntityDefinition, 1);
    harness.loseAccess();
    harness.regainAccess(saveableDefinitionDraft('kind: new'));
    createDefinitionSaveAction(harness.runtime)();
    await expectCallCount(definitionApi.saveEntityDefinition, 2);

    oldReadback.resolve();
    await flushPromises();
    createDefinitionSaveAction(harness.runtime)();
    expect(definitionApi.saveEntityDefinition).toHaveBeenCalledTimes(2);

    newReadback.resolve();
    await flushPromises();
  });

  it('keeps a new definition refresh locked when the retired refresh settles late', async () => {
    const oldRefresh = deferred<void>();
    const newRefresh = deferred<void>();
    const harness = definitionHarness(definitionDraft('kind: service'));
    harness.runtime.options.refetchCanonical = vi
      .fn()
      .mockReturnValueOnce(oldRefresh.promise)
      .mockReturnValueOnce(newRefresh.promise);

    createDefinitionRefreshAction(harness.runtime)();
    expect(harness.runtime.options.refetchCanonical).toHaveBeenCalledTimes(1);
    harness.loseAccess();
    harness.regainAccess(definitionDraft('kind: service'));
    createDefinitionRefreshAction(harness.runtime)();
    expect(harness.runtime.options.refetchCanonical).toHaveBeenCalledTimes(2);

    oldRefresh.resolve();
    await flushPromises();
    createDefinitionRefreshAction(harness.runtime)();
    expect(harness.runtime.options.refetchCanonical).toHaveBeenCalledTimes(2);

    newRefresh.resolve();
    await flushPromises();
  });

  it('keeps a new import preview locked when the retired preview settles late', async () => {
    const oldPreview = deferred<typeof importPreview>();
    const newPreview = deferred<typeof importPreview>();
    importApi.previewEntityDefinitionBundle
      .mockReturnValueOnce(oldPreview.promise)
      .mockReturnValueOnce(newPreview.promise);
    const harness = importHarness({ content: 'kind: old', format: 'yaml' });

    void runEntityImportPreview(harness.draft(), false, harness.runtime, harness.boundary.write);
    expect(importApi.previewEntityDefinitionBundle).toHaveBeenCalledTimes(1);
    harness.loseAccess();
    harness.regainAccess({ content: 'kind: new', format: 'yaml' });
    void runEntityImportPreview(harness.draft(), false, harness.runtime, harness.boundary.write);
    expect(importApi.previewEntityDefinitionBundle).toHaveBeenCalledTimes(2);

    oldPreview.resolve(importPreview);
    await flushPromises();
    void runEntityImportPreview(harness.draft(), false, harness.runtime, harness.boundary.write);
    expect(importApi.previewEntityDefinitionBundle).toHaveBeenCalledTimes(2);

    newPreview.resolve(importPreview);
    await flushPromises();
  });

  it('keeps a new import confirmation locked when the retired confirmation settles late', async () => {
    const oldConfirmation = deferred<number[]>();
    const newConfirmation = deferred<number[]>();
    importApi.commitEntityDefinitionBundle
      .mockReturnValueOnce(oldConfirmation.promise)
      .mockReturnValueOnce(newConfirmation.promise);
    const harness = importHarness(importDraft('kind: old'));
    const client = new QueryClient();

    void runEntityImportConfirmation(harness.draft(), false, client, harness.runtime, harness.boundary.write);
    expect(importApi.commitEntityDefinitionBundle).toHaveBeenCalledTimes(1);
    harness.loseAccess();
    harness.regainAccess(importDraft('kind: new'));
    void runEntityImportConfirmation(harness.draft(), false, client, harness.runtime, harness.boundary.write);
    expect(importApi.commitEntityDefinitionBundle).toHaveBeenCalledTimes(2);

    oldConfirmation.resolve([41]);
    await flushPromises();
    void runEntityImportConfirmation(harness.draft(), false, client, harness.runtime, harness.boundary.write);
    expect(importApi.commitEntityDefinitionBundle).toHaveBeenCalledTimes(2);

    newConfirmation.resolve([42]);
    await flushPromises();
  });
});

const importPreview = [resource];

function definitionDraft(content: string) {
  return resetEntityDefinitionDraft(7, 'yaml', content);
}

function saveableDefinitionDraft(content: string) {
  return previewedEntityDefinition(definitionDraft(content), resource);
}

function definitionHarness(initialDraft: EntityDefinitionDraft, readbacks: Promise<void>[] = []) {
  const boundary = generationBoundary();
  let state = initialEntityDefinitionEditingSession;
  const runtime: EntityDefinitionEditingRuntime = {
    options: {
      id: 7,
      format: 'yaml',
      canonical: initialDraft.canonical,
      setFormat: vi.fn(),
      refreshAfterSave: vi.fn(() => readbacks.shift() ?? Promise.resolve()),
      refetchCanonical: vi.fn()
    },
    state,
    source: '7:yaml',
    draft: initialDraft,
    patch: next => {
      state = { ...state, ...next };
      runtime.state = state;
    },
    locks: { revision: 0, preview: undefined, save: undefined, refresh: undefined },
    write: boundary.write
  };
  return {
    runtime,
    loseAccess() {
      boundary.loseAccess();
      retireEntityDefinitionEditing(runtime.locks, next => {
        state = typeof next === 'function' ? next(state) : next;
        runtime.state = state;
      });
    },
    regainAccess(draft: EntityDefinitionDraft) {
      boundary.regainAccess();
      runtime.draft = draft;
      runtime.options.canonical = draft.canonical;
    }
  };
}

function importDraft(content: string) {
  return previewedEntityImport({ content, format: 'yaml' }, importPreview);
}

function importHarness(initialDraft: typeof initialEntityImportDraft) {
  const boundary = generationBoundary();
  let draft = initialDraft;
  const runtime: EntityImportRuntime = {
    revision: { current: 0 },
    previewLock: { current: undefined },
    confirmLock: { current: undefined },
    setDraft: next => {
      draft = typeof next === 'function' ? next(draft) : next;
    },
    setPreviewing: vi.fn(),
    setConfirming: vi.fn(),
    setFailure: vi.fn(),
    setCreatedIds: vi.fn()
  };
  return {
    boundary,
    runtime,
    draft: () => draft,
    loseAccess() {
      boundary.loseAccess();
      runtime.revision.current += 1;
      runtime.previewLock.current = undefined;
      runtime.confirmLock.current = undefined;
      draft = initialEntityImportDraft;
    },
    regainAccess(nextDraft: typeof initialEntityImportDraft) {
      boundary.regainAccess();
      draft = nextDraft;
    }
  };
}

function generationBoundary() {
  let authorized = true;
  let generation = 0;
  return {
    write: {
      admit: () => (authorized ? generation : undefined),
      current: (owner: number) => authorized && owner === generation
    },
    loseAccess() {
      authorized = false;
      generation += 1;
    },
    regainAccess() {
      authorized = true;
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => {
    resolve = next;
  });
  return { promise, resolve };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function expectCallCount(mock: ReturnType<typeof vi.fn>, count: number) {
  await vi.waitFor(() => expect(mock).toHaveBeenCalledTimes(count));
}
