/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { SessionContext } from '@/core/auth/session-context';
import type { UiSession } from '@/core/auth/session-api';
import { useLogFacetWorkspace } from '../controller/use-log-facet-workspace';
import { exploreLogPreferenceKey } from '../model/explore-log-display-preferences';

const alice: UiSession = {
  authenticated: true,
  username: 'alice',
  workspaceId: 'workspace-one',
  roles: [],
  expiresAt: null
};

let session: UiSession | undefined = alice;
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SessionContext.Provider value={{ session, loading: false, retry: () => undefined }}>
      {children}
    </SessionContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  session = alice;
});

it('persists displayed and expanded facets per authenticated user', () => {
  const region = { id: 'resource:cloud.region', source: 'resource', key: 'cloud.region' } as const;
  const hook = renderHook(() => useLogFacetWorkspace(), { wrapper });
  act(() => hook.result.current.setAvailableFacetIds([region.id]));
  act(() => {
    hook.result.current.onAddFacet(region);
  });
  act(() => hook.result.current.toggleFacet(region.id));
  expect(hook.result.current.addedFacetIds).toEqual([region.id]);
  expect(hook.result.current.expandedFacetIds).not.toContain(region.id);

  session = { ...alice, username: 'bob' };
  hook.rerender();
  expect(hook.result.current.addedFacetIds).toEqual([]);
  session = alice;
  hook.rerender();
  expect(hook.result.current.addedFacetIds).toEqual([region.id]);
  expect(hook.result.current.expandedFacetIds).not.toContain(region.id);
});

it('ignores oversized stored facet preferences', () => {
  localStorage.setItem(
    exploreLogPreferenceKey('facets', { workspaceId: 'workspace-one', username: 'alice' }),
    ' '.repeat(65_537)
  );
  const hook = renderHook(() => useLogFacetWorkspace(), { wrapper });
  expect(hook.result.current.addedFacetIds).toEqual([]);
  expect(hook.result.current.expandedFacetIds).toEqual(['builtin:severityCategory']);
});
