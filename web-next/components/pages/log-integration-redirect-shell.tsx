'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ParityAppHeader, ParityAppShellFrame, ParityPlaceholderShell } from '../parity/angular-parity-kit';
import { useI18n } from '../providers/i18n-provider';
import { Button } from '../ui/button';

export function LogIntegrationRedirectShell({
  ingestionHref,
  manageHref
}: {
  ingestionHref: string;
  manageHref: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    router.replace(ingestionHref);
  }, [ingestionHref, router]);

  return (
    <ParityAppShellFrame>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-4 px-4 py-6">
        <ParityAppHeader
          title={t('menu.log.integration')}
          subtitle={t('log.integration.redirect.description')}
        />
        <ParityPlaceholderShell
          title={t('log.integration.redirect.title')}
          subtitle={t('log.integration.redirect.description')}
          actions={
            <>
              <Link href={ingestionHref}>
                <Button size="sm" variant="primary">{t('log.integration.redirect.cta.ingestion')}</Button>
              </Link>
              <Link href={manageHref}>
                <Button size="sm" variant="default">{t('log.integration.redirect.cta.manage')}</Button>
              </Link>
            </>
          }
        >
          <p>{t('log.integration.redirect.description')}</p>
        </ParityPlaceholderShell>
      </main>
    </ParityAppShellFrame>
  );
}
