import React from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function buildSettingsMenuRows(t: Translator): Array<{
  key: string;
  title: string;
  copy: string;
  meta: string;
  extra: ReactNode;
}> {
  const menus = [
    { href: '/setting/settings/config', label: t('settings.system-config') },
    { href: '/setting/settings/server', label: t('settings.server') },
    { href: '/setting/settings/object-store', label: t('settings.object-store') },
    { href: '/setting/settings/token', label: t('settings.token') }
  ];

  return menus.map(item => ({
    key: item.href,
    title: item.label,
    copy: t('setting.settings.menu.copy'),
    meta: item.href,
    extra: (
      <Link
        href={item.href}
        aria-label={t('setting.settings.menu.open-action', { title: item.label })}
        className="text-xs uppercase tracking-[0.16em] text-white/44"
      >
        {t('common.open')}
      </Link>
    )
  }));
}
