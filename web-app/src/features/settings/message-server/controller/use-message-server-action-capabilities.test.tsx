/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

import { useMessageServerActionCapabilities } from './use-message-server-action-capabilities';

describe('useMessageServerActionCapabilities', () => {
  it.each([
    [['ADMIN'], true],
    [['USER'], false],
    [['GUEST'], false]
  ] as const)('derives ADMIN-only configuration from session roles %s', (roles, canConfigure) => {
    const view = renderHook(() => useMessageServerActionCapabilities(), {
      wrapper: sessionWrapper([...roles])
    });

    expect(view.result.current).toEqual({ canConfigure });
  });
});

function sessionWrapper(roles: string[]) {
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
