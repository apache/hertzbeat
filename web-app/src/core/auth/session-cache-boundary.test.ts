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

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { anonymousSession, sessionQueryKey, type UiSession } from './session-api';
import { createCheckingSessionQueryClient, createSessionQueryClient } from './session-cache-boundary';

const userA: UiSession = {
  authenticated: true,
  username: 'operator-a',
  roles: ['ADMIN'],
  workspaceId: 'workspace-a',
  expiresAt: null
};

const userB: UiSession = {
  authenticated: true,
  username: 'operator-b',
  roles: ['ADMIN'],
  workspaceId: 'workspace-b',
  expiresAt: null
};

describe('session cache identity boundary', () => {
  it('creates an empty checking generation without session or protected data', () => {
    const sourceClient = new QueryClient();
    sourceClient.setQueryData(sessionQueryKey, userA);
    sourceClient.setQueryData(['protected', 'workspace-a'], { owner: 'operator-a' });

    const checkingClient = createCheckingSessionQueryClient(() => new QueryClient());

    expect(checkingClient.getQueryData(sessionQueryKey)).toBeUndefined();
    expect(checkingClient.getQueryData(['protected', 'workspace-a'])).toBeUndefined();
    expect(checkingClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('isolates anonymous and user B from late user A query and mutation callbacks', async () => {
    const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const userAClient = createSessionQueryClient(createQueryClient, userA);
    userAClient.setQueryData(['protected', 'workspace-a'], { owner: 'operator-a' });

    let resolveLateQuery: (value: { owner: string }) => void = () => undefined;
    const lateQuery = userAClient.fetchQuery({
      queryKey: ['protected', 'late-workspace-a'],
      queryFn: () =>
        new Promise(resolve => {
          resolveLateQuery = resolve;
        })
    });
    let resolveLateMutation: () => void = () => undefined;
    const lateMutation = userAClient
      .getMutationCache()
      .build(userAClient, {
        mutationKey: ['protected', 'update-workspace-a'],
        mutationFn: () =>
          new Promise<void>(resolve => {
            resolveLateMutation = resolve;
          }),
        onSuccess: () => {
          userAClient.setQueryData(['protected', 'mutation-workspace-a'], { owner: 'operator-a' });
        }
      })
      .execute(undefined);

    const anonymousClient = createSessionQueryClient(createQueryClient, anonymousSession);
    userAClient.clear();

    expect(anonymousClient.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
    expect(anonymousClient.getQueryData(['protected', 'workspace-a'])).toBeUndefined();
    expect(anonymousClient.getQueryCache().getAll()).toHaveLength(1);
    expect(anonymousClient.getMutationCache().getAll()).toHaveLength(0);

    resolveLateQuery({ owner: 'operator-a' });
    await expect(lateQuery).rejects.toThrow();
    expect(anonymousClient.getQueryData(['protected', 'late-workspace-a'])).toBeUndefined();
    resolveLateMutation();
    await lateMutation;
    expect(userAClient.getQueryData(['protected', 'mutation-workspace-a'])).toEqual({ owner: 'operator-a' });
    expect(anonymousClient.getQueryData(['protected', 'mutation-workspace-a'])).toBeUndefined();

    const userBClient = createSessionQueryClient(createQueryClient, userB);
    anonymousClient.clear();

    expect(userBClient.getQueryData(sessionQueryKey)).toEqual(userB);
    expect(userBClient.getQueryData(['protected', 'mutation-workspace-a'])).toBeUndefined();
    expect(userBClient.getQueryCache().getAll()).toHaveLength(1);
    expect(userBClient.getMutationCache().getAll()).toHaveLength(0);
  });
});
