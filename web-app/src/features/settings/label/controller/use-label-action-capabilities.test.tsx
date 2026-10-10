/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

import { useLabelActionCapabilities } from './use-label-action-capabilities';

describe('useLabelActionCapabilities', () => {
  it.each([
    [['ADMIN'], { canRead: true, canCreate: true, canUpdate: true, canDelete: true }],
    [['USER'], { canRead: true, canCreate: true, canUpdate: true, canDelete: false }],
    [['GUEST'], { canRead: true, canCreate: false, canUpdate: false, canDelete: false }],
    [[], { canRead: false, canCreate: false, canUpdate: false, canDelete: false }]
  ] as const)('derives fail-closed label commands from session roles %s', (roles, expected) => {
    const view = renderHook(() => useLabelActionCapabilities(), {
      wrapper: sessionWrapper([...roles])
    });

    expect(view.result.current).toEqual(expected);
  });

  it('keeps every command closed while the session is unavailable', () => {
    const view = renderHook(() => useLabelActionCapabilities(), {
      wrapper: sessionWrapper(undefined)
    });

    expect(view.result.current).toEqual({
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false
    });
  });
});

function sessionWrapper(roles: string[] | undefined) {
  return function SessionWrapper({ children }: PropsWithChildren) {
    return (
      <SessionContext.Provider
        value={{
          session:
            roles === undefined
              ? undefined
              : { authenticated: true, username: 'operator', workspaceId: null, roles, expiresAt: null },
          loading: false,
          retry: () => undefined
        }}
      >
        {children}
      </SessionContext.Provider>
    );
  };
}
