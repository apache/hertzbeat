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
import { loadLocale, resolveLocale } from '@/core/i18n/i18n';
import { supportedLocales } from '@/core/i18n/locale';
import { persistSystemPreferences, readRuntimeLocale } from '@/core/runtime-preferences';
import { useRuntimeTheme } from '@/core/runtime-theme-context';
import { useSharedTime } from '@/shared/time';

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

  const refresh = async () => {
    sharedTime.requestRefresh();
    await queryClient.invalidateQueries({ type: 'active' });
  };
  const changeLanguage = async () => {
    const current = readRuntimeLocale() ?? resolveLocale(i18n.resolvedLanguage);
    const next = supportedLocales[(supportedLocales.indexOf(current) + 1) % supportedLocales.length] ?? 'en-US';
    persistSystemPreferences({ locale: next, theme });
    await loadLocale(next);
  };
  const toggleTheme = () => setTheme(theme === 'default' ? 'dark' : 'default');
  const openAlerts = () => go({ to: '/alerts', type: 'push' });

  return {
    sharedTime,
    loggingOut,
    refresh,
    changeLanguage,
    toggleTheme,
    openAlerts,
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
