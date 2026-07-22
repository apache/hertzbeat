/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';

import { defaultAuthenticatedPath, loginPath } from '@/core/auth/navigation';
import { anonymousSession, loginSession, logoutSession, SessionRequestError } from '@/core/auth/session-api';
import { useSession } from '@/core/auth/session-context';
import { useSessionIdentityBoundary, type ReplaceSessionIdentity } from '@/core/auth/session-identity-context';
import {
  resolveSessionLockAdmission,
  sessionLockFailureMessageKey,
  type SessionLockFailure
} from '@/core/auth/session-lock-model';
import { clearSessionLockMarker, readSessionLockMarker } from '@/core/auth/session-lock-storage';

type LockOperation = 'unlock' | 'logout';

export function useSessionLockController() {
  const navigate = useNavigate();
  const replaceIdentity = useSessionIdentityBoundary();
  const sessionState = useSession();
  const [markerRead] = useState(readSessionLockMarker);
  const [password, setPassword] = useState('');
  const session = sessionState.session ?? anonymousSession;
  const admission = resolveSessionLockAdmission(markerRead, session);
  const command = useSessionLockCommands(admission, password, setPassword, navigate, replaceIdentity);
  const failure = command.failure ?? visibleAdmissionFailure(sessionState, admission.kind);

  useEffect(() => {
    if (!sessionState.loading && !sessionState.failure && admission.kind === 'unlocked') {
      void navigate(session.authenticated ? defaultAuthenticatedPath : loginPath, { replace: true });
    }
  }, [admission.kind, navigate, session.authenticated, sessionState.failure, sessionState.loading]);

  return {
    canUnlock: admission.kind === 'ready' && password.length > 0 && command.operation === null,
    failure,
    failureKey: failure ? sessionLockFailureMessageKey(failure) : undefined,
    identity: session.authenticated ? { username: session.username, workspaceId: session.workspaceId } : null,
    loading: sessionState.loading,
    operation: command.operation,
    password,
    retrySession: sessionState.retry,
    retryableSessionFailure: sessionState.failure !== undefined,
    setPassword,
    unlock: command.unlock,
    logout: command.logout
  };
}

type Admission = ReturnType<typeof resolveSessionLockAdmission>;
type CommandState = {
  mounted: { current: boolean };
  owner: { current: LockOperation | null };
  setFailure: (failure: SessionLockFailure | null) => void;
  setOperation: (operation: LockOperation | null) => void;
};

function useSessionLockCommands(
  admission: Admission,
  password: string,
  setPassword: (password: string) => void,
  navigate: NavigateFunction,
  replaceIdentity: ReplaceSessionIdentity
) {
  const [operation, setOperation] = useState<LockOperation | null>(null);
  const [failure, setFailure] = useState<SessionLockFailure | null>(null);
  const owner = useRef<LockOperation | null>(null);
  const mounted = useRef(false);
  const state = { mounted, owner, setFailure, setOperation };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      owner.current = null;
    };
  }, []);
  return {
    failure,
    operation,
    unlock: () => executeUnlock(admission, password, setPassword, navigate, replaceIdentity, state),
    logout: () => executeLogout(setPassword, navigate, replaceIdentity, state)
  };
}

async function executeUnlock(
  admission: Admission,
  password: string,
  setPassword: (password: string) => void,
  navigate: NavigateFunction,
  replaceIdentity: ReplaceSessionIdentity,
  state: CommandState
) {
  if (!claim(state.owner, 'unlock')) return;
  state.setOperation('unlock');
  state.setFailure(null);
  if (admission.kind !== 'ready' || password.length === 0) {
    return finishFailure(state, admissionFailure(admission.kind));
  }
  try {
    const authenticated = await loginSession(admission.marker.username, password);
    if (!owns(state.owner, state.mounted, 'unlock')) return;
    if (!authenticated.authenticated) return finishFailure(state, 'session-expired');
    if (!sameIdentity(admission.marker, authenticated) || !clearSessionLockMarker()) {
      return finishFailure(state, 'contract');
    }
    setPassword('');
    state.owner.current = null;
    state.setOperation(null);
    replaceIdentity(authenticated);
    void navigate(admission.marker.returnTo, { replace: true });
  } catch (error) {
    finishFailure(state, classifyLockFailure(error));
  }
}

async function executeLogout(
  setPassword: (password: string) => void,
  navigate: NavigateFunction,
  replaceIdentity: ReplaceSessionIdentity,
  state: CommandState
) {
  if (!claim(state.owner, 'logout')) return;
  state.setOperation('logout');
  state.setFailure(null);
  try {
    await logoutSession();
    if (state.mounted.current && state.owner.current !== 'logout') return;
    clearSessionLockMarker();
    state.owner.current = null;
    if (state.mounted.current) {
      setPassword('');
      state.setOperation(null);
    }
    replaceIdentity(anonymousSession);
    if (state.mounted.current) void navigate(loginPath, { replace: true });
  } catch (error) {
    finishFailure(state, classifyLockFailure(error));
  }
}

function visibleAdmissionFailure(
  state: ReturnType<typeof useSession>,
  admission: ReturnType<typeof resolveSessionLockAdmission>['kind']
): SessionLockFailure | null {
  if (state.loading) return null;
  if (state.failure === 'unavailable') return 'unavailable';
  if (state.failure === 'contract') return 'contract';
  if (state.failure) return 'error';
  return admission === 'contract' || admission === 'session-expired' ? admission : null;
}

function admissionFailure(admission: ReturnType<typeof resolveSessionLockAdmission>['kind']): SessionLockFailure {
  if (admission === 'session-expired') return 'session-expired';
  return admission === 'contract' ? 'contract' : 'error';
}

function sameIdentity(
  marker: { username: string; workspaceId: string },
  session: { username: string | null; workspaceId: string | null }
) {
  return marker.username === session.username && marker.workspaceId === session.workspaceId;
}

function claim(owner: { current: LockOperation | null }, operation: LockOperation) {
  if (owner.current) return false;
  owner.current = operation;
  return true;
}

function owns(owner: { current: LockOperation | null }, mounted: { current: boolean }, operation: LockOperation) {
  return mounted.current && owner.current === operation;
}

function finishFailure(state: CommandState, failure: SessionLockFailure) {
  if (!state.mounted.current) return;
  state.owner.current = null;
  state.setOperation(null);
  state.setFailure(failure);
}

function classifyLockFailure(error: unknown): SessionLockFailure {
  if (!(error instanceof SessionRequestError)) return 'error';
  if (error.kind === 'invalid-credentials' || error.kind === 'unavailable' || error.kind === 'contract')
    return error.kind;
  return 'error';
}
