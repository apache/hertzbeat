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

import { useMonitorCapabilities } from './use-monitor-capabilities';

describe('useMonitorCapabilities', () => {
  it.each([
    [['ADMIN'], true],
    [['USER'], true],
    [['GUEST'], false]
  ] as const)('adapts session roles %s through the central monitor policy', (roles, canWrite) => {
    const view = renderHook(() => useMonitorCapabilities(), {
      wrapper: createSessionWrapper([...roles])
    });

    expect(view.result.current.canWrite).toBe(canWrite);
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
