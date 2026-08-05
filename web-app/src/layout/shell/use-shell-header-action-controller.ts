/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useGo } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { anonymousSession, logoutSession } from '@/core/auth/session-api';
import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';
import { buildSessionLockMarker } from '@/core/auth/session-lock-model';
import { persistSessionLockMarker } from '@/core/auth/session-lock-storage';
import { useRuntimeTheme } from '@/core/runtime-theme-context';
import { useLocaleChangeAction } from '@/shared/i18n/use-locale-change-action';
import { alertRoutePaths, applicationRoutePaths } from '@/shared/navigation/app-paths';
import { settingsPaths } from '@/shared/settings/settings-routes';
import { useSharedTime } from '@/shared/time';

import { useShellFullscreenAction } from './use-shell-fullscreen-action';

export function useShellHeaderActionController() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const { theme, setTheme } = useRuntimeTheme();
  const queryClient = useQueryClient();
  const replaceSessionIdentity = useSessionIdentityBoundary();
  const go = useGo();
  const sharedTime = useSharedTime();
  const completeLogout = useCallback(() => {
    // Rotating the identity boundary prevents the previous user's cached queries from surviving logout.
    replaceSessionIdentity(anonymousSession);
  }, [replaceSessionIdentity]);
  const reportLogoutFailure = useCallback(() => {
    void message.error(t('auth.logoutFailed'));
  }, [message, t]);
  const { loggingOut, logout } = useLogoutAction(completeLogout, reportLogoutFailure);
  const changeLanguage = useLocaleChangeAction(i18n.resolvedLanguage, theme);
  const fullscreen = useShellFullscreenAction();

  const refresh = async () => {
    // Time-owned queries observe refreshRevision/window. Invalidating them as
    // well would start a second request for the same header action.
    if (sharedTime.manualRefreshOwner === 'time_revision') {
      sharedTime.requestRefresh();
      return;
    }
    await queryClient.invalidateQueries({ type: 'active' });
  };
  const toggleTheme = () => setTheme(theme === 'default' ? 'dark' : 'default');
  const toggleFullscreen = async () => {
    const result = await fullscreen.toggle();
    if (result === 'error') void message.error(t('shell.actions.fullscreenFailed'));
    return result;
  };
  const openAlerts = () => go({ to: alertRoutePaths.center, type: 'push' });
  const openSettings = () => go({ to: settingsPaths.system, type: 'push' });
  const lock = (session: Parameters<typeof buildSessionLockMarker>[0], returnTo: string) => {
    const marker = buildSessionLockMarker(session, returnTo);
    if (!marker || !persistSessionLockMarker(marker)) {
      void message.error(t('auth.lock.admissionFailed'));
      return false;
    }
    go({ to: applicationRoutePaths.lock, type: 'replace' });
    return true;
  };

  return {
    sharedTime,
    fullscreen: fullscreen.state,
    loggingOut,
    refresh,
    changeLanguage,
    toggleTheme,
    toggleFullscreen,
    openAlerts,
    openSettings,
    lock,
    logout
  };
}

function useLogoutAction(onSuccess: () => void, onFailure: () => void) {
  const [loggingOut, setLoggingOut] = useState(false);
  const nextOwner = useRef(0);
  const currentOwner = useRef<number | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      currentOwner.current = null;
    };
  }, []);

  const logout = useCallback(async () => {
    // State is not synchronous, so the ref must own admission before the first await.
    if (currentOwner.current !== null) return;
    const owner = ++nextOwner.current;
    currentOwner.current = owner;
    setLoggingOut(true);
    try {
      await logoutSession();
      // Server logout remains authoritative after this view unmounts; identity rotation is still required.
      if (mounted.current && currentOwner.current !== owner) return;
      onSuccess();
    } catch {
      if (currentOwner.current !== owner || !mounted.current) return;
      currentOwner.current = null;
      setLoggingOut(false);
      onFailure();
    }
  }, [onFailure, onSuccess]);

  return { loggingOut, logout };
}
