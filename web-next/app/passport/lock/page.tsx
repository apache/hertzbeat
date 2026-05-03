'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, UserRound } from 'lucide-react';
import { ObservabilityStatusState } from '@/components/observability';
import { useI18n } from '@/components/providers/i18n-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateUnlockPassword } from '../../../lib/passport-lock/view-model';
import { PassportPanel, PassportShell } from '../../../components/pages/passport-shell';

export default function PassportLockPage() {
  const { t } = useI18n();
  const router = useRouter();
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
    <PassportShell panelClassName="max-w-[712px] lg:max-w-[712px]">
      <PassportPanel
        className="mx-auto min-h-[334px] max-w-[712px] rounded-none border-[var(--ops-border-color)] bg-[#101217] px-6 py-14 shadow-none lg:px-[120px]"
      >
        <div data-passport-lock-panel="angular-wide" className="mx-auto flex min-h-[220px] max-w-[320px] flex-col justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/75 text-[var(--ops-surface-base)] shadow-none">
              <UserRound size={28} />
            </div>
            <div className="mt-6 text-[16px] font-semibold text-[var(--ops-text-primary)]">{t('app.lock')}</div>
          </div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5" data-passport-lock="true">
            <div className="relative">
              <LockKeyhole
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-tertiary)]"
              />
              <Input
                placeholder={t('app.lock.placeholder')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-9 border-[var(--ops-border-color)] bg-[var(--ops-surface-base)] pl-10"
              />
            </div>
            <div className="flex justify-end">
              <Button className="min-w-[76px]" size="sm" variant="primary" type="submit">
                {t('app.lock')}
              </Button>
            </div>
          </form>
          {error ? (
            <div className="mt-4">
              <ObservabilityStatusState title={t('common.failed')} copy={error} tone="danger" />
            </div>
          ) : null}
        </div>
      </PassportPanel>
    </PassportShell>
  );
}
