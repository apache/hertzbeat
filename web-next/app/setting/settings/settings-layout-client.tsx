'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/providers/i18n-provider';
import { SettingsConsoleShell } from '@/components/settings/settings-console-shell';
import { buildSettingsMenuRows } from '@/lib/setting-settings-layout/view-model';

export default function SettingsSettingsLayoutClient({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const menus = buildSettingsMenuRows(t).map(row => ({
    href: row.key,
    label: row.title
  }));

  return (
    <SettingsConsoleShell
      items={menus}
      activeHref={pathname}
      contentLabel={t('settings.console.content')}
      kicker={t('settings.console.kicker')}
      navigationLabel={t('settings.console.navigation')}
      title={t('settings.console.title')}
      subtitle={t('settings.console.copy')}
      className=""
    >
      {children}
    </SettingsConsoleShell>
  );
}
