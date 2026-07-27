/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

import { useNoticeActionCapabilities } from './use-notice-action-capabilities';

describe('useNoticeActionCapabilities', () => {
  it.each([
    [['ADMIN'], true, true, true, true],
    [['USER'], true, true, true, false],
    [['GUEST'], false, false, false, false]
  ] as const)('maps session roles %s to Notice actions', (roles, canCreate, canEdit, canTest, canDelete) => {
    const view = renderHook(() => useNoticeActionCapabilities(), {
      wrapper: createSessionWrapper([...roles])
    });

    expect(view.result.current).toEqual({ canCreate, canEdit, canTest, canDelete });
  });
});

function createSessionWrapper(roles: string[]) {
  return function SessionWrapper({ children }: PropsWithChildren) {
    return (
      <SessionContext.Provider
        value={{
          session: { authenticated: true, username: 'operator', workspaceId: null, roles, expiresAt: null },
          loading: false,
          retry: () => undefined
        }}
      >
        {children}
      </SessionContext.Provider>
    );
  };
}
