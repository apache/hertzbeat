'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/providers/i18n-provider';
import { SettingsConsoleShell } from '@/components/settings/settings-console-shell';
import { buildSettingsMenuRows } from '@/lib/setting-settings-layout/view-model';

export default function SettingSettingsLayout({ children }: { children: React.ReactNode }) {
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
      kicker={t('settings.console.kicker')}
      title={t('settings.console.title')}
      subtitle={t('settings.console.copy')}
      className=""
    >
      {children}
    </SettingsConsoleShell>
  );
}
