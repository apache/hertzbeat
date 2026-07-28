/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  BrowserAlertNotificationRuntime,
  BrowserAlertPermission
} from '@/core/notification/browser-alert-notification';

import type { AlertEventSignal } from '../api/alert-event-schema';
import { loadShellAlertMute } from '../api/shell-alert-notification-api';
import { alertFailureKind } from '../model/alert-model';
import { shellAlertSoundCanToggle, type ShellAlertSoundState } from '../model/shell-alert-notification-model';
import { shellAlertNotificationQueryKeys } from './shell-alert-notification-query-keys';
import { useShellAlertMuteOperation } from './use-shell-alert-mute-operation';

const notifiedAlertLimit = 128;
const chineseAlertSound = '/assets/audio/default-alert-CN.mp3';
const defaultAlertSound = '/assets/audio/default-alert-EN.mp3';

type SoundControllerOptions = {
  locale: string | undefined;
  notificationTitle: string;
  notificationBody: string;
  onOpenAlerts: () => void;
  roles: readonly string[];
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
  const canToggle = shellAlertSoundCanToggle(options.roles);
  const update = useShellAlertMuteOperation({
    canToggle,
    currentMuted: muteQuery.data?.muted,
    runtime,
    setPermission
  });
  const notifiedIds = useRef<number[]>([]);
  const soundSnapshot = useRef({ muted: true, permission });
  const delivery = useRef({ locale, notificationBody, notificationTitle, onOpenAlerts, runtime });

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
      update.failure,
      canToggle
    ),
    toggleSound: update.toggle,
    onAlert
  };
}

function readSoundState(
  pending: boolean,
  error: Error | null,
  muted: boolean | undefined,
  saving: boolean,
  permission: BrowserAlertPermission,
  failure: 'save_failed' | null,
  canToggle: boolean
): ShellAlertSoundState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertFailureKind(error) };
  if (muted === undefined) return { kind: 'error' };
  return { kind: 'ready', canToggle, muted, saving, permission, failure };
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
