/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

import { useAlertCapabilities } from './use-alert-capabilities';

describe('useAlertCapabilities', () => {
  it.each([
    [['ADMIN'], true, true, true],
    [['USER'], true, false, true],
    [['GUEST'], false, false, false]
  ] as const)(
    'maps session roles %s to Alert Center action permissions',
    (roles, canUpdateStatus, canDeleteGroups, canSelect) => {
      const view = renderHook(() => useAlertCapabilities(), {
        wrapper: createSessionWrapper([...roles])
      });

      expect(view.result.current).toMatchObject({ canUpdateStatus, canDeleteGroups, canSelect });
    }
  );
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
