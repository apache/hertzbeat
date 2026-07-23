/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  loadEditableEntity: vi.fn(),
  loadEntityDefinition: vi.fn(),
  previewEntityDefinition: vi.fn(),
  saveEntityDefinition: vi.fn()
}));
vi.mock('../api/entity-editor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-editor-api')>()),
  loadEditableEntity: api.loadEditableEntity
}));
vi.mock('../api/entity-definition-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-definition-api')>()),
  loadEntityDefinition: api.loadEntityDefinition,
  previewEntityDefinition: api.previewEntityDefinition,
  saveEntityDefinition: api.saveEntityDefinition
}));

import { useEntityDefinitionController } from './use-entity-definition-controller';

const resource = {
  entity: { id: 7, type: 'service', name: 'checkout' },
  identities: null,
  monitorBinds: null,
  relations: null
};

describe('useEntityDefinitionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEditableEntity.mockResolvedValue(resource);
    api.loadEntityDefinition.mockImplementation((_id, format) =>
      Promise.resolve(format === 'yaml' ? 'kind: service' : '{"kind":"service"}')
    );
    api.previewEntityDefinition.mockResolvedValue(resource);
    api.saveEntityDefinition.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('guards dirty format changes/reset and invalidates a preview on edit', async () => {
    const routed = renderController('/entities/7/definition');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.changeContent('kind: database'));
    act(() => routed.current().actions.changeFormat('json'));
    expect(routed.current().state.format).toBe('yaml');
    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.preview).toBeDefined());
    act(() => routed.current().actions.changeContent('kind: host'));
    expect(routed.current().state.preview).toBeUndefined();
    act(() => routed.current().actions.reset());
    expect(routed.current().state.content).toBe('kind: service');
    act(() => routed.current().actions.changeFormat('json'));
    await waitFor(() => expect(routed.current().state.content).toBe('{"kind":"service"}'));
  });

  it('locks exact-snapshot save, prevents same-tick/double writes, and refetches/invalidate caches on success', async () => {
    api.loadEntityDefinition.mockResolvedValueOnce('kind: service').mockResolvedValueOnce('kind: database');
    let resolveSave: (() => void) | undefined;
    api.saveEntityDefinition.mockReturnValue(new Promise<void>(resolve => (resolveSave = resolve)));
    const routed = renderController('/entities/7/definition?returnTo=%2Fentities%3Fsearch%3Dmysql');
    const invalidate = vi.spyOn(routed.client, 'invalidateQueries');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.changeContent('kind: database'));
    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.saveEnabled).toBe(true));
    act(() => {
      routed.current().actions.preview();
      routed.current().actions.save();
    });
    expect(api.saveEntityDefinition).not.toHaveBeenCalled();
    await waitFor(() => expect(routed.current().state.previewing).toBe(false));
    act(() => {
      routed.current().actions.save();
      routed.current().actions.save();
    });
    await waitFor(() => expect(routed.current().state.saving).toBe(true));
    act(() => {
      routed.current().actions.changeContent('kind: host');
      routed.current().actions.reset();
      routed.current().actions.back();
    });
    expect(routed.current().state.content).toBe('kind: database');
    expect(routed.location()).toContain('/entities/7/definition');
    act(() => resolveSave?.());
    await waitFor(() => expect(routed.current().state.saved).toBe(true));
    expect(routed.current().state.content).toBe('kind: database');
    expect(routed.current().state.dirty).toBe(false);
    expect(routed.current().state.preview).toBeUndefined();
    expect(api.saveEntityDefinition).toHaveBeenCalledTimes(1);
    expect(api.loadEntityDefinition.mock.calls.length).toBeGreaterThan(1);
    expect(invalidate).toHaveBeenCalled();
  });

  it('keeps a successful write committed when the canonical refetch fails', async () => {
    api.loadEntityDefinition
      .mockResolvedValueOnce('kind: service')
      .mockRejectedValueOnce(new Error('read-back unavailable'))
      .mockRejectedValueOnce(new Error('read-back still unavailable'))
      .mockResolvedValueOnce('kind: database');
    const routed = renderController('/entities/7/definition');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.changeContent('kind: database'));
    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.saveEnabled).toBe(true));
    act(() => routed.current().actions.save());
    await waitFor(() => expect(routed.current().state.refreshFailure?.kind).toBe('error'));
    expect(routed.current().state.evidence.kind).toBe('ready');
    expect(routed.current().state.content).toBe('kind: database');
    expect(routed.current().state.dirty).toBe(false);
    expect(routed.current().state.preview).toBeUndefined();
    expect(routed.current().state.saved).toBe(true);
    expect(routed.current().state.saveEnabled).toBe(false);
    expect(routed.current().state.failure).toBeUndefined();
    act(() => routed.current().actions.save());
    expect(api.saveEntityDefinition).toHaveBeenCalledTimes(1);
    act(() => routed.current().actions.retry());
    await waitFor(() => expect(api.loadEntityDefinition).toHaveBeenCalledTimes(3));
    expect(routed.current().state.refreshFailure?.kind).toBe('error');
    expect(routed.current().state.content).toBe('kind: database');
    act(() => routed.current().actions.retry());
    await waitFor(() => expect(routed.current().state.refreshFailure).toBeUndefined());
    expect(routed.current().state.content).toBe('kind: database');
    expect(routed.current().state.dirty).toBe(false);
  });

  it('keeps a dirty draft across a successful background refetch', async () => {
    const routed = renderController('/entities/7/definition');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.changeContent('kind: database'));
    await act(() => routed.client.refetchQueries({ queryKey: ['entities', 'definition', 7, 'yaml'] }));
    expect(routed.current().state.content).toBe('kind: database');
    expect(routed.current().state.dirty).toBe(true);
  });
});

function renderController(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useEntityDefinitionController> | undefined;
  let location = '';
  function Probe() {
    controller = useEntityDefinitionController();
    const current = useLocation();
    location = `${current.pathname}${current.search}`;
    return null;
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/entities/:entityId/definition" element={<Probe />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return {
    client,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    },
    location: () => location
  };
}
