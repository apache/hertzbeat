'use client';

import React from 'react';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useI18n } from '../providers/i18n-provider';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { StatusState } from '../workbench/primitives';
import { apiGet } from '../../lib/api-client';
import { assertLoginSuccess, bootstrapPostLoginSession, buildLoginRequestBody, LOGIN_REDIRECT_QUERY_KEY, persistLoginTokens, resolvePostLoginRedirectTarget } from '../../lib/passport-login/controller';
import type { LoginMessage } from '../../lib/passport-login/controller';
import { buildLoginNotice, shouldBlockDefaultPasswordSubmit, shouldWarnDefaultPassword } from '../../lib/passport-login/view-model';
import { PassportPanel, PassportShell } from './passport-shell';

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needUpdatePassword, setNeedUpdatePassword] = useState(false);
  const notice = buildLoginNotice(needUpdatePassword, t);
  const fieldLabelClassName = 'sr-only';
  const fieldIconClassName = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-tertiary)]';
  const fieldInputClassName = 'h-11 border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] pl-10 shadow-none';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (shouldBlockDefaultPasswordSubmit(needUpdatePassword, credential)) {
      setNeedUpdatePassword(true);
      setError(null);
      return;
    }

    setNeedUpdatePassword(shouldWarnDefaultPassword(credential));
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/account/auth/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildLoginRequestBody(identifier, credential))
      });
      const message = (await response.json()) as LoginMessage;
      const tokens = assertLoginSuccess(
        response.status,
        message,
        t('passport.login.error.with-status')
      );
      persistLoginTokens(window.localStorage, tokens);
      await bootstrapPostLoginSession(apiGet);
      router.replace(resolvePostLoginRedirectTarget(searchParams.get(LOGIN_REDIRECT_QUERY_KEY)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('passport.login.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PassportShell panelClassName="max-w-[368px] self-start">
      <div
        data-passport-login-panel="angular-gray-card"
        data-passport-login-panel-align="angular-top"
      >
        <PassportPanel
          className="rounded-none border border-[rgba(33,35,42,0.68)] border-b-[var(--ops-primary)] border-r-[var(--ops-primary)] bg-[#5f5f66] px-5 py-9 shadow-none"
          header={(
            <div className="text-left">
              <h1 className="text-[16px] font-semibold leading-6 text-white">
                {t('app.login.tab-login-credentials')}
              </h1>
              <div
                className="mt-3 h-px w-[148px] bg-[#7f8faa]"
                data-passport-login-accent="true"
              />
            </div>
          )}
        >
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className={fieldLabelClassName}>
              {t('app.login.message-need-identifier')}
            </span>
            <div className="relative">
              <UserRound size={16} className={fieldIconClassName} />
              <Input
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder={t('app.login.message-need-identifier')}
                className={fieldInputClassName}
              />
            </div>
          </label>
          <label className="block space-y-2">
            <span className={fieldLabelClassName}>
              {t('app.login.message-need-credential')}
            </span>
            <div className="relative">
              <LockKeyhole size={16} className={fieldIconClassName} />
              <Input
                value={credential}
                onChange={e => {
                  const nextValue = e.target.value;
                  setCredential(nextValue);
                  if (!shouldWarnDefaultPassword(nextValue) && needUpdatePassword) {
                    setNeedUpdatePassword(false);
                  }
                }}
                placeholder={t('app.login.message-need-credential')}
                type={showCredential ? 'text' : 'password'}
                className={`${fieldInputClassName} pr-10`}
              />
              <button
                aria-label={showCredential ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[var(--ops-text-tertiary)] transition-colors hover:text-white"
                data-passport-login-password-eye="true"
                type="button"
                onClick={() => setShowCredential(current => !current)}
              >
                {showCredential ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </label>

          <div data-passport-login-remember="true">
            <Checkbox
              data-passport-login-remember-checkbox="cold-checkbox"
              defaultChecked
              containerClassName="min-h-4 gap-2 text-[13px] font-medium text-[#17181c]"
              label="Remember me"
            />
          </div>

          {notice.kind === 'warning' ? (
            <a
              className="flex items-start gap-3 rounded-[6px] border border-[rgba(216,111,91,0.28)] bg-[var(--ops-surface-elevated)] px-4 py-3 text-sm text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:text-[var(--ops-text-primary)]"
              href={notice.href}
              target="_blank"
              rel="noreferrer"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--ops-primary)]" />
              <span>{notice.copy}</span>
            </a>
          ) : null}

          <Button className="h-11 w-full" variant="primary" type="submit" disabled={loading} size="lg">
            {loading ? t('passport.login.loading') : t('app.login.login')}
          </Button>
        </form>

        {error ? (
          <div className="mt-4">
            <StatusState title={t('common.attention')} copy={error} tone="danger" />
          </div>
        ) : null}
        </PassportPanel>
      </div>
    </PassportShell>
  );
}
