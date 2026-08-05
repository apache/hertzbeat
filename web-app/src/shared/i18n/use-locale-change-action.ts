/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';

import { loadLocale, resolveLocale } from '@/core/i18n/i18n';
import { supportedLocales, type SupportedLocale } from '@/core/i18n/locale';
import { persistSystemPreferences, readRuntimeLocale, readRuntimeTheme } from '@/core/runtime-preferences';

type LocaleChangeOwner = {
  abort: AbortController;
  locale: SupportedLocale;
};

export function useLocaleChangeAction(resolvedLanguage: string | undefined, theme = readRuntimeTheme()) {
  const mounted = useRef(false);
  const current = useRef<LocaleChangeOwner | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      current.current?.abort.abort();
      current.current = undefined;
    };
  }, []);

  return useCallback(
    async (requestedLocale?: SupportedLocale) => {
      const base = current.current?.locale ?? readRuntimeLocale() ?? resolveLocale(resolvedLanguage);
      const locale = requestedLocale ?? nextLocale(base);
      current.current?.abort.abort();
      const owner = { abort: new AbortController(), locale };
      current.current = owner;
      const owns = () => mounted.current && current.current === owner;
      try {
        const published = await loadLocale(locale, { signal: owner.abort.signal });
        if (!published || !owns()) return false;
        persistSystemPreferences({ locale, theme });
        return true;
      } catch {
        return false;
      } finally {
        if (current.current === owner) current.current = undefined;
      }
    },
    [resolvedLanguage, theme]
  );
}

function nextLocale(locale: SupportedLocale) {
  return supportedLocales[(supportedLocales.indexOf(locale) + 1) % supportedLocales.length] ?? 'en-US';
}
