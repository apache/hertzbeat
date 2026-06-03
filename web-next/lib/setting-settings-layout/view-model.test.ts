import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildSettingsMenuRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('setting settings layout view model', () => {
  it('builds settings menu rows', () => {
    const rows = buildSettingsMenuRows(t);

    expect(rows.map(row => ({ key: row.key, title: row.title, copy: row.copy, meta: row.meta }))).toEqual([
      { key: '/setting/settings/config', title: t('settings.system-config'), copy: t('setting.settings.menu.copy'), meta: '/setting/settings/config' },
      { key: '/setting/settings/server', title: t('settings.server'), copy: t('setting.settings.menu.copy'), meta: '/setting/settings/server' },
      { key: '/setting/settings/object-store', title: t('settings.object-store'), copy: t('setting.settings.menu.copy'), meta: '/setting/settings/object-store' },
      { key: '/setting/settings/token', title: t('settings.token'), copy: t('setting.settings.menu.copy'), meta: '/setting/settings/token' }
    ]);

    const firstAction = renderToStaticMarkup(React.createElement(React.Fragment, null, rows[0]?.extra));

    expect(firstAction).toContain(t('common.open'));
    expect(firstAction).toContain(`aria-label="${t('setting.settings.menu.open-action', { title: t('settings.system-config') })}"`);
    expect(renderToStaticMarkup(React.createElement(React.Fragment, null, rows[3]?.extra))).toContain(
      `aria-label="${t('setting.settings.menu.open-action', { title: t('settings.token') })}"`
    );
    expect(firstAction).not.toContain('common.open');
  });
});
