/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  BrowserAlertNotificationRuntime,
  BrowserAlertPermission
} from '@/core/notification/browser-alert-notification';

import type { AlertEventSignal } from '../api/alert-event-schema';
import { loadShellAlertMute, saveShellAlertMute } from '../api/shell-alert-notification-api';
import { alertFailureKind } from '../model/alert-model';
import type { ShellAlertSoundState } from '../model/shell-alert-notification-model';
import { shellAlertNotificationQueryKeys } from './shell-alert-notification-query-keys';

const notifiedAlertLimit = 128;
const chineseAlertSound = '/assets/audio/default-alert-CN.mp3';
const defaultAlertSound = '/assets/audio/default-alert-EN.mp3';

type SoundControllerOptions = {
  locale: string | undefined;
  notificationTitle: string;
  notificationBody: string;
  onOpenAlerts: () => void;
  runtime: BrowserAlertNotificationRuntime;
};

export function useShellAlertSoundController(options: SoundControllerOptions) {
  const { locale, notificationBody, notificationTitle, onOpenAlerts, runtime } = options;
  const muteQuery = useQuery({
    queryKey: shellAlertNotificationQueryKeys.mute(),
    queryFn: ({ signal }) => loadShellAlertMute(signal),
    retry: false
  });
  const [permission, setPermission] = useState(() => runtime.readPermission());
  const update = useMuteUpdate(muteQuery.data?.muted, runtime, setPermission);
  const notifiedIds = useRef<number[]>([]);
  const soundSnapshot = useRef({ muted: true, permission });
  const delivery = useRef(options);

  useEffect(() => {
    soundSnapshot.current = { muted: muteQuery.data?.muted ?? true, permission };
  }, [muteQuery.data?.muted, permission]);

  useEffect(() => {
    delivery.current = { locale, notificationBody, notificationTitle, onOpenAlerts, runtime };
  }, [locale, notificationBody, notificationTitle, onOpenAlerts, runtime]);

  const onAlert = useCallback((event: AlertEventSignal | null) => {
    const snapshot = soundSnapshot.current;
    if (!event || event.status !== 'firing' || snapshot.muted || !rememberAlert(notifiedIds.current, event.id)) return;
    const current = delivery.current;
    current.runtime.playSound(alertSoundSource(current.locale));
    if (snapshot.permission === 'granted') {
      current.runtime.show({
        title: current.notificationTitle,
        body: current.notificationBody,
        icon: '/assets/logo.svg',
        onClick: current.onOpenAlerts
      });
    }
  }, []);

  return {
    state: readSoundState(
      muteQuery.isPending,
      muteQuery.error,
      muteQuery.data?.muted,
      update.saving,
      permission,
      update.failure
    ),
    toggleSound: update.toggle,
    onAlert
  };
}

function useMuteUpdate(
  currentMuted: boolean | undefined,
  runtime: BrowserAlertNotificationRuntime,
  setPermission: (permission: BrowserAlertPermission) => void
) {
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<'save_failed' | null>(null);
  const mounted = useRef(false);
  const updating = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      updating.current = false;
    };
  }, []);
  const toggle = useCallback(async () => {
    if (updating.current || currentMuted === undefined) return;
    updating.current = true;
    setSaving(true);
    setFailure(null);
    const muted = !currentMuted;
    try {
      if (!muted) {
        const nextPermission = await runtime.requestPermission();
        if (mounted.current) setPermission(nextPermission);
      }
      client.setQueryData(shellAlertNotificationQueryKeys.mute(), await saveShellAlertMute(muted));
    } catch {
      if (mounted.current) setFailure('save_failed');
    } finally {
      updating.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [client, currentMuted, runtime, setPermission]);
  return { saving, failure, toggle };
}

function readSoundState(
  pending: boolean,
  error: Error | null,
  muted: boolean | undefined,
  saving: boolean,
  permission: BrowserAlertPermission,
  failure: 'save_failed' | null
): ShellAlertSoundState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertFailureKind(error) };
  if (muted === undefined) return { kind: 'error' };
  return { kind: 'ready', muted, saving, permission, failure };
}

function rememberAlert(ids: number[], id: number) {
  if (ids.includes(id)) return false;
  ids.push(id);
  if (ids.length > notifiedAlertLimit) ids.shift();
  return true;
}

function alertSoundSource(locale: string | undefined) {
  return locale === 'zh-CN' || locale === 'zh-TW' ? chineseAlertSound : defaultAlertSound;
}
