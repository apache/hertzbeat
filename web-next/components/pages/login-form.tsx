'use client';

import React from 'react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { HzPassportLoginActionFrame, HzPassportLoginNotice, HzPassportLoginValidationNotice } from '@hertzbeat/ui';
import { useI18n } from '../providers/i18n-provider';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { apiGet } from '../../lib/api-client';
import {
  assertSessionLoginSuccess,
  bootstrapPostLoginSession,
  buildLoginRequestBody,
  buildPostLoginSessionUser,
  resolvePostLoginStartupFailureTarget,
  type LoginMessage,
  type PassportLoginRouteState
} from '../../lib/passport-login/controller';
import { buildLoginNotice, shouldBlockDefaultPasswordSubmit, shouldWarnDefaultPassword, validateCredentialLoginDraft } from '../../lib/passport-login/view-model';
import { writeClientSessionUserSnapshot } from '../../lib/session-client';
import { markAboutAutoShowAfterLogin } from '../../lib/shell/about';
import { resetWorkbenchLoadCache } from '../../lib/workbench-load-cache';
import { PassportPanel, PassportShell } from './passport-shell';

const EMPTY_PASSPORT_LOGIN_ROUTE_STATE: PassportLoginRouteState = {
  redirectTarget: '/'
};

export function LoginForm({ initialRouteState }: { initialRouteState?: PassportLoginRouteState } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const passportLoginRouteState = initialRouteState ?? EMPTY_PASSPORT_LOGIN_ROUTE_STATE;
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
    const validation = validateCredentialLoginDraft(identifier, credential, t);
    if (validation) {
      setError(validation.message);
      return;
    }

    if (shouldBlockDefaultPasswordSubmit(needUpdatePassword, credential)) {
      setNeedUpdatePassword(true);
      setError(null);
      return;
    }

    if (shouldWarnDefaultPassword(credential)) {
      setNeedUpdatePassword(true);
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/account/auth/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildLoginRequestBody(identifier, credential))
      });
      const message = (await response.json()) as LoginMessage;
      assertSessionLoginSuccess(
        response.status,
        message,
        t('passport.login.error.with-status')
      );
      resetWorkbenchLoadCache();
      writeClientSessionUserSnapshot(buildPostLoginSessionUser(identifier, message));
      try {
        await bootstrapPostLoginSession(apiGet);
      } catch {
        router.replace(resolvePostLoginStartupFailureTarget());
        return;
      }
      markAboutAutoShowAfterLogin();
      router.replace(passportLoginRouteState.redirectTarget);
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
        data-passport-login-submit-lifecycle-contract="angular-required-default-warning-session-bootstrap-redirect"
        data-passport-login-default-password-lifecycle-contract="angular-sticky-until-submit"
        data-passport-login-startup-failure-contract="angular-exception-500"
        data-passport-login-redirect-fallback-contract="angular-root-fallback"
        data-passport-login-submit-lifecycle-owner="hertzbeat-ui-passport-login-action"
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
        <HzPassportLoginActionFrame
          className="mt-4"
          data-passport-login-submit-lifecycle="angular-required-default-warning-session-bootstrap-redirect"
          data-passport-login-submit-lifecycle-owner="hertzbeat-ui-passport-login-action"
          data-passport-login-required-mode-contract="angular-required-no-trim"
          data-passport-login-required-mode-owner="hertzbeat-ui-passport-login-action"
          data-passport-login-session-user-name-contract="angular-raw-identifier"
          data-passport-login-session-user-name-owner="hertzbeat-ui-passport-login-action"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className={fieldLabelClassName}>
                {t('app.login.message-need-identifier')}
              </span>
              <div className="relative">
                <UserRound size={16} className={fieldIconClassName} />
                <Input
                  value={identifier}
                  onChange={e => {
                    setIdentifier(e.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
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
                    if (error) {
                      setError(null);
                    }
                  }}
                  placeholder={t('app.login.message-need-credential')}
                  type={showCredential ? 'text' : 'password'}
                  className={`${fieldInputClassName} pr-10`}
                />
                <button
                  aria-label={showCredential ? t('app.login.password-hide') : t('app.login.password-show')}
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
                label={t('app.login.remember-me')}
              />
            </div>

            {notice.kind === 'warning' ? (
              <HzPassportLoginNotice copy={notice.copy} href={notice.href} />
            ) : null}

            <Button className="h-11 w-full" variant="primary" type="submit" disabled={loading} size="lg">
              {loading ? t('passport.login.loading') : t('app.login.login')}
            </Button>
          </form>
        </HzPassportLoginActionFrame>

        {error ? (
          <div className="mt-4">
            <HzPassportLoginValidationNotice title={t('common.attention')} copy={error} />
          </div>
        ) : null}
        </PassportPanel>
      </div>
    </PassportShell>
  );
}
