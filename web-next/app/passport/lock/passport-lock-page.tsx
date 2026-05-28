'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HzPassportLockSurface } from '@hertzbeat/ui';
import { useI18n } from '@/components/providers/i18n-provider';
import { validateUnlockPassword } from '../../../lib/passport-lock/view-model';
import { readClientSessionUserSnapshot } from '../../../lib/session-client';
import { PassportPanel, PassportShell } from '../../../components/pages/passport-shell';

export default function PassportLockPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [sessionUser] = useState(() => readClientSessionUserSnapshot());
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateUnlockPassword(password, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    router.replace('/overview');
  }

  return (
    <PassportShell panelClassName="max-w-[712px] lg:max-w-[712px]" sessionLifecycle="preserve-on-lock">
      <PassportPanel
        className="mx-auto min-h-[334px] max-w-[712px] rounded-none border-[var(--ops-border-color)] bg-[#101217] px-6 py-14 shadow-none lg:px-[120px]"
      >
        <HzPassportLockSurface
          title={t('app.lock')}
          passwordLabel={t('app.lock.placeholder')}
          passwordPlaceholder={t('app.lock.placeholder')}
          buttonLabel={t('app.lock')}
          password={password}
          avatarSrc={sessionUser?.avatar}
          avatarAlt={sessionUser?.name || t('app.lock')}
          error={error}
          disabled={password.length === 0}
          onPasswordChange={value => {
            setPassword(value);
            if (error) setError(null);
          }}
          onSubmit={handleSubmit}
          data-passport-lock="true"
          data-passport-lock-panel="angular-wide"
          data-passport-lock-panel-owner="hertzbeat-ui-passport-lock"
          data-passport-lock-avatar-contract="angular-settings-user-avatar"
          data-passport-lock-session-contract="angular-lock-preserve-session"
          data-passport-lock-submit-lifecycle-contract="angular-mark-dirty-required-then-dashboard"
          data-passport-lock-submit-lifecycle-owner="hertzbeat-ui-passport-lock"
          data-passport-lock-redirect-contract="angular-dashboard-next-overview"
          data-passport-lock-required-mode-contract="angular-required-no-trim"
          data-passport-lock-required-mode-owner="hertzbeat-ui-passport-lock"
        />
      </PassportPanel>
    </PassportShell>
  );
}
