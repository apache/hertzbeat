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

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { safeRedirectTarget } from '@/core/auth/navigation';
import { loginSession, SessionRequestError } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';
import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';

import {
  loginErrorMessageKey,
  resolveLoginSessionState,
  type LoginCredentials,
  type LoginFailureKind
} from '../model/login-model';

export function useLoginController() {
  const navigate = useNavigate();
  const replaceSessionIdentity = useSessionIdentityBoundary();
  const [searchParams] = useSearchParams();
  const { loading, retry, session, unavailable } = useSession();
  const submitting = useRef(false);
  const navigatedTargetRef = useRef<string | null>(null);
  const redirectTarget = safeRedirectTarget(searchParams.get('redirect')) ?? applicationRoutePaths.dashboard;
  const login = useMutation({
    mutationFn: ({ identifier, credential }: LoginCredentials) => loginSession(identifier, credential)
  });

  useEffect(() => {
    // Keep the completed target through transient checking or unavailable evidence.
    // A true anonymous state retires it so a later login may navigate again.
    if (loading || unavailable) return;
    if (!session?.authenticated) {
      navigatedTargetRef.current = null;
      return;
    }
    if (navigatedTargetRef.current === redirectTarget) return;
    navigatedTargetRef.current = redirectTarget;
    void navigate(redirectTarget, { replace: true });
  }, [loading, navigate, redirectTarget, session?.authenticated, unavailable]);

  const submit = async (values: LoginCredentials) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const authenticated = await login.mutateAsync(values);
      replaceSessionIdentity(authenticated);
    } catch {
      // React Query retains the classified error for the presentation boundary.
      submitting.current = false;
    }
  };

  return {
    errorKey: login.error ? loginErrorMessageKey(classifyLoginFailure(login.error)) : undefined,
    pending: login.isPending,
    retrySession: retry,
    sessionState: resolveLoginSessionState({
      loading,
      unavailable,
      authenticated: Boolean(session?.authenticated)
    }),
    submit
  };
}

function classifyLoginFailure(error: unknown): LoginFailureKind {
  if (!(error instanceof SessionRequestError)) return 'error';
  if (error.kind === 'invalid-credentials') return 'invalid-credentials';
  if (error.kind === 'unavailable') return 'unavailable';
  return 'error';
}
