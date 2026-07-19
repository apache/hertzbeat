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

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';
import { anonymousSession, sessionQueryKey, type UiSession } from '@/core/auth/session-api';

import { SessionQueryRuntime, type SessionQueryRuntimeValue } from './session-query-runtime';

const userA = authenticatedSession('operator-a', 'workspace-a');
const userB = authenticatedSession('operator-b', 'workspace-b');

describe('SessionQueryRuntime', () => {
  it('rotates the mounted client so a late user A mutation cannot reach anonymous or user B', async () => {
    const clients: QueryClient[] = [];
    const createQueryClient = () => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      clients.push(client);
      return client;
    };
    render(
      <SessionQueryRuntime createQueryClient={createQueryClient}>
        {runtime => (
          <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
            <RuntimeProbe runtime={runtime} />
          </QueryClientProvider>
        )}
      </SessionQueryRuntime>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));
    const userAClient = clients.at(-1);
    if (!userAClient) throw new Error('User A QueryClient was not created.');

    let resolveMutation: () => void = () => undefined;
    const mutationResult = new Promise<void>(resolve => {
      resolveMutation = resolve;
    });
    const lateMutation = userAClient
      .getMutationCache()
      .build(userAClient, {
        mutationFn: () => mutationResult,
        onSuccess: () => userAClient.setQueryData(['protected', 'late-a'], 'operator-a')
      })
      .execute(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Publish anonymous' }));
    const anonymousClient = clients.at(-1);
    expect(anonymousClient).not.toBe(userAClient);
    expect(screen.getByTestId('client-match')).toHaveTextContent('same');
    expect(anonymousClient?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);

    resolveMutation();
    await lateMutation;
    expect(userAClient.getQueryData(['protected', 'late-a'])).toBe('operator-a');
    expect(anonymousClient?.getQueryData(['protected', 'late-a'])).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Publish user B' }));
    const userBClient = clients.at(-1);
    expect(userBClient).not.toBe(anonymousClient);
    expect(screen.getByTestId('client-match')).toHaveTextContent('same');
    expect(userBClient?.getQueryData(sessionQueryKey)).toEqual(userB);
    expect(userBClient?.getQueryData(['protected', 'late-a'])).toBeUndefined();
  });
});

function RuntimeProbe({ runtime }: { runtime: SessionQueryRuntimeValue }) {
  const mountedClient = useQueryClient();
  const replaceIdentity = useSessionIdentityBoundary();
  return (
    <>
      <output data-testid="client-match">{mountedClient === runtime.queryClient ? 'same' : 'different'}</output>
      <button type="button" onClick={() => replaceIdentity(userA)}>
        Publish user A
      </button>
      <button type="button" onClick={() => replaceIdentity(anonymousSession)}>
        Publish anonymous
      </button>
      <button type="button" onClick={() => replaceIdentity(userB)}>
        Publish user B
      </button>
    </>
  );
}

function authenticatedSession(username: string, workspaceId: string): UiSession {
  return { authenticated: true, username, workspaceId, roles: ['ADMIN'], expiresAt: null };
}
