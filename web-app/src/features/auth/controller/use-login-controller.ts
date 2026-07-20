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

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { safeRedirectTarget } from '@/core/auth/navigation';
import { loginSession, SessionRequestError } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';
import { useSessionIdentityBoundary, type ReplaceSessionIdentity } from '@/core/auth/session-identity-context';
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
  const login = useLoginCommand(replaceSessionIdentity);
  const navigatedTargetRef = useRef<string | null>(null);
  const redirectTarget = safeRedirectTarget(searchParams.get('redirect')) ?? applicationRoutePaths.dashboard;

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

  return {
    errorKey: login.failure ? loginErrorMessageKey(login.failure) : undefined,
    pending: login.pending,
    retrySession: retry,
    sessionState: resolveLoginSessionState({
      loading,
      unavailable,
      authenticated: Boolean(session?.authenticated)
    }),
    submit: login.submit
  };
}

function useLoginCommand(replaceSessionIdentity: ReplaceSessionIdentity) {
  const submitting = useRef(false);
  const mounted = useRef(false);
  const nextCommand = useRef(0);
  const activeCommand = useRef<number | null>(null);
  const [failure, setFailure] = useState<LoginFailureKind | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeCommand.current = null;
      submitting.current = false;
    };
  }, []);

  const submit = async (values: LoginCredentials) => {
    if (submitting.current) return;
    submitting.current = true;
    const command = ++nextCommand.current;
    activeCommand.current = command;
    setFailure(null);
    setPending(true);
    const { identifier, credential } = values;
    try {
      const authenticated = await loginSession(identifier, credential);
      if (!mounted.current || activeCommand.current !== command) return;
      replaceSessionIdentity(authenticated);
      if (!mounted.current || activeCommand.current !== command) return;
      activeCommand.current = null;
      submitting.current = false;
      setPending(false);
    } catch (error) {
      if (!mounted.current || activeCommand.current !== command) return;
      activeCommand.current = null;
      submitting.current = false;
      setFailure(classifyLoginFailure(error));
      setPending(false);
    }
  };
  return { failure, pending, submit };
}

function classifyLoginFailure(error: unknown): LoginFailureKind {
  if (!(error instanceof SessionRequestError)) return 'error';
  if (error.kind === 'invalid-credentials') return 'invalid-credentials';
  if (error.kind === 'unavailable') return 'unavailable';
  return 'error';
}
