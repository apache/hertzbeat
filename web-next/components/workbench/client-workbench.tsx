'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ObservabilityStatusState } from '@/components/observability';
import { useI18n } from '@/components/providers/i18n-provider';
import { getAuthorizationToken } from '@/lib/api-client';
import { resolveWorkbenchError } from '@/lib/client-workbench-state';
import { buildLoginRedirectHref, buildLoginReturnTo } from '@/lib/passport-login/controller';
import { consumeWorkbenchLoad } from '@/lib/workbench-load-cache';

export function ClientWorkbench<T>({
  load,
  children,
  loadingTitle,
  loadingCopy,
  cacheKey
}: {
  load: () => Promise<T>;
  children: (data: T) => React.ReactNode;
  loadingTitle?: string;
  loadingCopy?: string;
  cacheKey?: string;
}) {
  const { t } = useI18n();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<{
    load: (() => Promise<T>) | null;
    promise: Promise<T> | null;
  }>({
    load: null,
    promise: null
  });
  useEffect(() => {
    let cancelled = false;
    if (loadRef.current.load !== load) {
      loadRef.current = {
        load,
        promise: null
      };
    }
    if (!loadRef.current.promise) {
      loadRef.current.promise = cacheKey
        ? consumeWorkbenchLoad(cacheKey, load)
        : load().finally(() => {
            if (loadRef.current.load === load) {
              loadRef.current.promise = null;
            }
          });
    }
    loadRef.current.promise
      .then(result => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          const { redirectToLogin, message } = resolveWorkbenchError(err, Boolean(getAuthorizationToken()), t);
          if (redirectToLogin) {
            const returnTo = buildLoginReturnTo(window.location);
            window.location.href = buildLoginRedirectHref(returnTo, process.env.NEXT_PUBLIC_LOGIN_PATH);
            return;
          }
          setError(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, load, t]);

  if (error) {
    return <ObservabilityStatusState title={t('common.load-failed')} copy={error} tone="danger" />;
  }

  if (!data) {
    const pendingTitle = loadingTitle ?? t('common.workbench.loading.title');
    const pendingCopy = loadingCopy ?? t('common.loading');

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
