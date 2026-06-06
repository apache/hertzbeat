'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isStandaloneRoute } from '../../lib/app-frame-state';
import { PREFIX_ALIASES, SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import {
  DEFAULT_LOCALE,
  interpolate,
  LOCALES,
  normalizeLocale,
  type LocaleCode,
  type TranslationParams
} from '../../lib/i18n';

type Messages = Record<string, string>;

type I18nContextValue = {
  locale: LocaleCode;
  locales: typeof LOCALES;
  ready: boolean;
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: string) => Promise<void>;
};

const REMOTE_OVERLAY_PREFIX = 'monitor.app.';

const STORAGE_KEYS = ['hb.lang', 'layout.lang'] as const;

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): LocaleCode | null {
  if (typeof window === 'undefined') return null;
  for (const key of STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return normalizeLocale(value);
  }
  return null;
}

function writeStoredLocale(locale: LocaleCode) {
  if (typeof window === 'undefined') return;
  for (const key of STORAGE_KEYS) {
    window.localStorage.setItem(key, locale);
  }
  document.documentElement.lang = locale;
}

export function shouldUseRemoteLocaleBootstrap(pathname?: string | null) {
  if (!pathname) return true;
  return !isStandaloneRoute(pathname);
}

function readCurrentPathname() {
  if (typeof window === 'undefined') return null;
  return window.location.pathname;
}

function buildLocalI18nPath(locale: LocaleCode) {
  return `/hb-i18n/${locale}`;
}

export function buildInitialMessages(locale: LocaleCode): Messages {
  return { ...(SUPPLEMENTAL_MESSAGES[locale] || {}) };
}

function mergeLocalMessages(locale: LocaleCode, localMessages: Messages): Messages {
  return {
    ...(SUPPLEMENTAL_MESSAGES[locale] || {}),
    ...localMessages
  };
}

function resolveOptimisticLocale(): LocaleCode {
  const stored = readStoredLocale();
  if (stored) return stored;

  if (typeof window !== 'undefined') {
    const browserLocale = window.navigator.languages?.[0] || window.navigator.language;
    return normalizeLocale(browserLocale);
  }

  return DEFAULT_LOCALE;
}

export function filterRemoteOverlayMessages(messages?: Messages | null): Messages {
  if (!messages) return {};
  return Object.fromEntries(Object.entries(messages).filter(([key]) => key.startsWith(REMOTE_OVERLAY_PREFIX)));
}

export function resolveMessageTemplate(messages: Messages, key: string) {
  if (messages[key]) {
    return messages[key];
  }

  for (const [from, to] of PREFIX_ALIASES) {
    if (!key.startsWith(from)) continue;
    const aliasedKey = `${to}${key.slice(from.length)}`;
    if (messages[aliasedKey]) {
      return messages[aliasedKey];
    }
  }

  return null;
}

function hasOverlayCollisions(baseMessages: Messages, overlayMessages: Messages) {
  return Object.keys(overlayMessages).some(key => key in baseMessages);
}

export async function loadLocaleMessages(locale: LocaleCode, allowRemoteOverrides: boolean): Promise<Messages> {
  let localMessages: Messages = {};

  try {
    const localResponse = await fetch(buildLocalI18nPath(locale), { cache: 'no-store' });
      if (localResponse.ok) {
        localMessages = (await localResponse.json()) as Messages;
      }
    } catch {
      // fall through with empty local bundle
    }

  const baseMessages = mergeLocalMessages(locale, localMessages);

  if (allowRemoteOverrides) {
    try {
      const remoteResponse = await fetch(`/api/i18n/${locale}`, { cache: 'no-store' });
      if (!remoteResponse.ok) {
        return baseMessages;
      }
      const remotePayload = (await remoteResponse.json()) as { code?: number; data?: Messages };
      if (remotePayload.code === 0 && remotePayload.data) {
        const overlayMessages = filterRemoteOverlayMessages(remotePayload.data);
        if (hasOverlayCollisions(baseMessages, overlayMessages)) {
          console.warn('Remote i18n overlay collision detected; ignoring overlay payload.');
          return baseMessages;
        }
        return { ...baseMessages, ...overlayMessages };
      }
    } catch {
      // keep local bundle as source of truth when remote overrides fail
    }
  }

  return baseMessages;
}

async function resolveInitialLocale(allowRemoteBootstrap: boolean): Promise<LocaleCode> {
  // Priority 1: localStorage (user's manual choice should always take precedence)
  const stored = readStoredLocale();
  if (stored) return stored;

  // Priority 2: Backend API system config
  if (allowRemoteBootstrap) {
    try {
      const response = await fetch('/api/config/system', { cache: 'no-store' });
      if (response.ok) {
        const payload = (await response.json()) as { code?: number; data?: { locale?: string | null } };
        const systemLocale = payload.code === 0 ? payload.data?.locale : null;
        if (systemLocale) {
          return normalizeLocale(systemLocale);
        }
      }
    } catch {
      // fall through
    }
  }

  // Priority 3: Browser language
  if (typeof window !== 'undefined') {
    const browserLocale = window.navigator.languages?.[0] || window.navigator.language;
    return normalizeLocale(browserLocale);
  }

  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Messages>(() => buildInitialMessages(DEFAULT_LOCALE));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function applyLocale(localeCode: LocaleCode, nextMessages: Messages, markReady: boolean) {
      if (cancelled) return;
      writeStoredLocale(localeCode);
      setLocaleState(localeCode);
      setMessages(nextMessages);
      if (markReady) {
        setReady(true);
      }
    }

    async function bootstrap() {
      const allowRemoteBootstrap = shouldUseRemoteLocaleBootstrap(readCurrentPathname());
      const optimisticLocale = resolveOptimisticLocale();
      const optimisticMessagesPromise = loadLocaleMessages(optimisticLocale, false).then(nextMessages => {
        applyLocale(optimisticLocale, nextMessages, Object.keys(nextMessages).length > 0);
        return nextMessages;
      });
      const resolvedLocale = await resolveInitialLocale(allowRemoteBootstrap);

      if (resolvedLocale === optimisticLocale && !allowRemoteBootstrap) {
        await optimisticMessagesPromise;
        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      const nextMessages = await loadLocaleMessages(resolvedLocale, allowRemoteBootstrap);
      applyLocale(resolvedLocale, nextMessages, true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      locales: LOCALES,
      ready,
      t: (key, params) => {
        const template = resolveMessageTemplate(messages, key) ?? (ready ? key : '');
        return interpolate(template, params);
      },
      setLocale: async nextLocale => {
        const normalized = normalizeLocale(nextLocale);
        const nextMessages = await loadLocaleMessages(
          normalized,
          shouldUseRemoteLocaleBootstrap(readCurrentPathname())
        );
        writeStoredLocale(normalized);
        setLocaleState(normalized);
        setMessages(nextMessages);
        setReady(true);
      }
    }),
    [locale, messages, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return value;
}
