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
import { loginSession } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';
import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';

import { loginErrorMessageKey } from './login-model';

type LoginValues = { identifier: string; credential: string };

export function useLoginController() {
  const navigate = useNavigate();
  const replaceSessionIdentity = useSessionIdentityBoundary();
  const [searchParams] = useSearchParams();
  const { loading, retry, session, unavailable } = useSession();
  const submitting = useRef(false);
  const redirectTarget = safeRedirectTarget(searchParams.get('redirect')) ?? applicationRoutePaths.dashboard;
  const login = useMutation({
    mutationFn: ({ identifier, credential }: LoginValues) => loginSession(identifier, credential)
  });

  useEffect(() => {
    if (!loading && !unavailable && session?.authenticated) {
      void navigate(redirectTarget, { replace: true });
    }
  }, [loading, navigate, redirectTarget, session?.authenticated, unavailable]);

  const submit = async (values: LoginValues) => {
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
    errorKey: login.error ? loginErrorMessageKey(login.error) : undefined,
    pending: login.isPending,
    retrySession: retry,
    sessionState: loading
      ? ('checking' as const)
      : unavailable
        ? ('unavailable' as const)
        : session?.authenticated
          ? ('authenticated' as const)
          : ('anonymous' as const),
    submit
  };
}
