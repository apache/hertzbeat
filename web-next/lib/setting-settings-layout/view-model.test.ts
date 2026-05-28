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
      { key: '/setting/settings/config', title: '系统配置', copy: '系统、存储、消息和令牌设置', meta: '/setting/settings/config' },
      { key: '/setting/settings/server', title: '消息服务配置', copy: '系统、存储、消息和令牌设置', meta: '/setting/settings/server' },
      { key: '/setting/settings/object-store', title: '文件服务配置', copy: '系统、存储、消息和令牌设置', meta: '/setting/settings/object-store' },
      { key: '/setting/settings/token', title: '令牌管理', copy: '系统、存储、消息和令牌设置', meta: '/setting/settings/token' }
    ]);

    const firstAction = renderToStaticMarkup(React.createElement(React.Fragment, null, rows[0]?.extra));

    expect(firstAction).toContain('打开');
    expect(firstAction).toContain('aria-label="打开系统配置"');
    expect(renderToStaticMarkup(React.createElement(React.Fragment, null, rows[3]?.extra))).toContain(
      'aria-label="打开令牌管理"'
    );
    expect(firstAction).not.toContain('common.open');
  });
});
