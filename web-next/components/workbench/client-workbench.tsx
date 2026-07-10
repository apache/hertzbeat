'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ObservabilityStatusState } from '@/components/observability';
import { useI18n } from '@/components/providers/i18n-provider';
import { resolveWorkbenchError } from '@/lib/client-workbench-state';
import { buildLoginRedirectHref, buildLoginReturnTo } from '@/lib/passport-login/controller';
import { readClientSessionState } from '@/lib/session-client';
import { consumeWorkbenchLoad, forgetWorkbenchLoad } from '@/lib/workbench-load-cache';

const CLIENT_WORKBENCH_LOADING_DELAY_MS = 650;

function withWorkbenchLoadTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined, message: string, onTimeout?: () => void) {
  if (timeoutMs == null || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
    }
  });
}

export function ClientWorkbench<T>({
  load,
  children,
  renderError,
  renderLoading,
  loadingTitle,
  loadingCopy,
  loadTimeoutMs,
  cacheKey,
  cacheSettledTtlMs,
  loadingDelayMs = CLIENT_WORKBENCH_LOADING_DELAY_MS
}: {
  load: () => Promise<T>;
  children: (data: T) => React.ReactNode;
  renderError?: (message: string, retry: () => void) => React.ReactNode;
  renderLoading?: (visible: boolean) => React.ReactNode;
  loadingTitle?: string;
  loadingCopy?: string;
  loadTimeoutMs?: number;
  cacheKey?: string;
  cacheSettledTtlMs?: number;
  loadingDelayMs?: number;
}) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPendingState, setShowPendingState] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const loadRef = useRef<{
    cacheKey: string | undefined;
    load: (() => Promise<T>) | null;
    promise: Promise<T> | null;
  }>({
    cacheKey: undefined,
    load: null,
    promise: null
  });
  const retry = () => {
    loadRef.current = {
      cacheKey: undefined,
      load: null,
      promise: null
    };
    setData(null);
    setError(null);
    setShowPendingState(false);
    setReloadKey(key => key + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setShowPendingState(false);
    const pendingDelay = Math.max(0, loadingDelayMs);
    const pendingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setShowPendingState(true);
      }
    }, pendingDelay);
    const localizedCacheKey = cacheKey ? `${cacheKey}::locale:${locale}` : undefined;
    if (loadRef.current.load !== load || loadRef.current.cacheKey !== localizedCacheKey) {
      loadRef.current = {
        cacheKey: localizedCacheKey,
        load,
        promise: null
      };
    }
    if (!loadRef.current.promise) {
      loadRef.current.promise = localizedCacheKey
        ? consumeWorkbenchLoad(localizedCacheKey, load, { settledTtlMs: cacheSettledTtlMs })
        : load().finally(() => {
            if (loadRef.current.load === load) {
              loadRef.current.promise = null;
            }
          });
    }
    withWorkbenchLoadTimeout(
      loadRef.current.promise,
      loadTimeoutMs,
      t('common.workbench.load-timeout'),
      localizedCacheKey ? () => forgetWorkbenchLoad(localizedCacheKey) : undefined
    )
      .then(result => {
        if (!cancelled) {
          window.clearTimeout(pendingTimer);
          setData(result);
          setError(null);
          void readClientSessionState().then(session => {
            if (cancelled || session.authenticated) return;
            const returnTo = buildLoginReturnTo(window.location);
            window.location.href = buildLoginRedirectHref(returnTo, process.env.NEXT_PUBLIC_LOGIN_PATH);
          });
        }
      })
      .catch(err => {
        if (!cancelled) {
          window.clearTimeout(pendingTimer);
          const { redirectToLogin, message } = resolveWorkbenchError(err, false, t);
          if (redirectToLogin) {
            void readClientSessionState().then(session => {
              if (cancelled || session.authenticated) return;
              const returnTo = buildLoginReturnTo(window.location);
              window.location.href = buildLoginRedirectHref(returnTo, process.env.NEXT_PUBLIC_LOGIN_PATH);
            });
          }
          setError(message ?? t('common.api.request-failed-status', { status: 401 }));
        }
      });
    return () => {
      cancelled = true;
      window.clearTimeout(pendingTimer);
    };
  }, [cacheKey, cacheSettledTtlMs, load, loadTimeoutMs, loadingDelayMs, locale, reloadKey, t]);

  if (error) {
    if (renderError) {
      return <>{renderError(error, retry)}</>;
    }
    return <ObservabilityStatusState title={t('common.load-failed')} copy={error} tone="danger" />;
  }

  if (!data) {
    if (renderLoading) {
      return <>{renderLoading(showPendingState)}</>;
    }

    if (!showPendingState) {
      return (
        <section
          data-client-workbench-loading="deferred"
          aria-busy="true"
          className="min-h-[260px]"
        />
      );
    }

    const pendingTitle = loadingTitle ?? t('common.workbench.loading.title');
    const pendingCopy = loadingCopy ?? t('common.workbench.loading.copy');

    return (
      <section
        data-client-workbench-loading="global-spinner"
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="flex min-h-[260px] items-center justify-center px-4 py-10"
      >
        <div className="flex max-w-[420px] flex-col items-center text-center">
          <Loader2
            data-client-workbench-loading-spinner="true"
            className="h-7 w-7 animate-spin text-[#8fb3ff]"
            aria-hidden="true"
          />
          <div className="mt-4 text-[15px] font-semibold text-[var(--ops-text-primary)]">{pendingTitle}</div>
          <div className="mt-1.5 text-[13px] leading-5 text-[var(--ops-text-secondary)]">{pendingCopy}</div>
        </div>
      </section>
    );
  }

  return <>{children(data)}</>;
}
