/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';

import type {
  BrowserAlertNotificationRuntime,
  BrowserAlertPermission
} from '@/core/notification/browser-alert-notification';

import { loadShellAlertMute, saveShellAlertMute } from '../api/shell-alert-notification-api';
import { shellAlertNotificationQueryKeys } from './shell-alert-notification-query-keys';

type MuteOwner = { epoch: number; canonicalRead: AbortController };
type MuteOperationOptions = {
  canToggle: boolean;
  currentMuted: boolean | undefined;
  runtime: BrowserAlertNotificationRuntime;
  setPermission: (permission: BrowserAlertPermission) => void;
};

export function useShellAlertMuteOperation(options: MuteOperationOptions) {
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<'save_failed' | null>(null);
  const mounted = useRef(true);
  const epoch = useRef(0);
  const owner = useRef<MuteOwner | null>(null);
  const canToggle = useRef(options.canToggle);
  const muted = useRef(options.currentMuted);
  const previousCanToggle = useRef(options.canToggle);
  // Event callbacks can run before layout effects, so render publishes current
  // capability and canonical mute evidence synchronously.
  // eslint-disable-next-line react-hooks/refs -- retained callbacks need current authorization before layout effects
  canToggle.current = options.canToggle;
  // eslint-disable-next-line react-hooks/refs -- retained callbacks must invert canonical render evidence, not captured state
  muted.current = options.currentMuted;
  const retire = useCallback((publish: boolean) => {
    epoch.current += 1;
    owner.current?.canonicalRead.abort();
    owner.current = null;
    if (publish && mounted.current) {
      setSaving(false);
      setFailure(null);
    }
  }, []);
  useLayoutEffect(() => {
    const lostCapability = previousCanToggle.current && !options.canToggle;
    previousCanToggle.current = options.canToggle;
    if (lostCapability) retire(true);
  }, [options.canToggle, retire]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      retire(false);
    };
  }, [retire]);
  const toggle = useCallback(async () => {
    if (!mounted.current || !canToggle.current || muted.current === undefined || owner.current) return;
    const nextOwner = { epoch: epoch.current + 1, canonicalRead: new AbortController() };
    epoch.current = nextOwner.epoch;
    owner.current = nextOwner;
    setSaving(true);
    setFailure(null);
    await runMuteUpdate(options, client, nextOwner, { mounted, epoch, owner, canToggle, muted, setFailure, setSaving });
  }, [client, options]);
  return { saving, failure, toggle };
}

type MuteRuntime = {
  mounted: MutableRefObject<boolean>;
  epoch: MutableRefObject<number>;
  owner: MutableRefObject<MuteOwner | null>;
  canToggle: MutableRefObject<boolean>;
  muted: MutableRefObject<boolean | undefined>;
  setFailure: (failure: 'save_failed' | null) => void;
  setSaving: (saving: boolean) => void;
};

async function runMuteUpdate(
  options: MuteOperationOptions,
  client: ReturnType<typeof useQueryClient>,
  owner: MuteOwner,
  state: MuteRuntime
) {
  const nextMuted = !state.muted.current;
  let postIssued = false;
  let convergeRetiredPost = false;
  try {
    if (!nextMuted) {
      const permission = await options.runtime.requestPermission();
      if (!isCurrent(owner, state)) return;
      options.setPermission(permission);
    }
    if (!isCurrent(owner, state)) return;
    postIssued = true;
    await saveShellAlertMute(nextMuted);
    if (!isCurrent(owner, state)) {
      convergeRetiredPost = true;
      return;
    }
    const canonical = await loadShellAlertMute(owner.canonicalRead.signal);
    if (!isCurrent(owner, state)) return;
    client.setQueryData(shellAlertNotificationQueryKeys.mute(), canonical);
  } catch {
    if (isCurrent(owner, state)) state.setFailure('save_failed');
    else convergeRetiredPost = postIssued;
  } finally {
    if (isCurrent(owner, state)) {
      state.owner.current = null;
      state.setSaving(false);
    }
    if (convergeRetiredPost) await refetchRetiredPost(client, state);
  }
}

async function refetchRetiredPost(client: ReturnType<typeof useQueryClient>, state: MuteRuntime) {
  // A retired issued POST may have committed server-side, so only a canonical
  // active query refetch can reconcile it without publishing request evidence.
  if (!state.mounted.current || state.owner.current) return;
  await client.invalidateQueries({
    queryKey: shellAlertNotificationQueryKeys.mute(),
    exact: true,
    refetchType: 'active'
  });
}

function isCurrent(owner: MuteOwner, state: MuteRuntime) {
  return (
    state.mounted.current &&
    state.canToggle.current &&
    state.owner.current === owner &&
    state.epoch.current === owner.epoch
  );
}
