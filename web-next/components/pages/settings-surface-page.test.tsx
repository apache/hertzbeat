import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t
  })
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => (
    <div data-row-list="true">
      {rows.map((row: any) => (
        <article key={row.key ?? row.title}>
          <h3>{row.title}</h3>
          <p>{row.copy}</p>
          <small>{row.meta}</small>
        </article>
      ))}
    </div>
  ),
  WorkbenchPage: ({ title, subtitle, main }: any) => (
    <div data-workbench-page="true">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <main>{main}</main>
    </div>
  )
}));

vi.mock('@/components/workbench/primitives', () => ({
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  )
}));

describe('SettingsSurfacePage', () => {
  it('renders platform governance groups without fake future navigation entries', async () => {
    const { SettingsSurfacePage } = await import('./settings-surface-page');

    const html = renderToStaticMarkup(
      <SettingsSurfacePage title="系统设置" subtitle="配置平台治理入口。" nextStep="整理平台治理" />
    );

    expect(html).toContain('平台治理');
    expect(html).toContain('设置总览');
    expect(html).toContain('把平台配置入口收拢到一个工作台。');
    expect(html).toContain('路由契约');
    expect(html).toContain('API 契约');
    expect(html).toContain('只展示当前已有入口');
    expect(html).toContain('未来大域保留在路线图文档');
    expect(html).toContain('API 访问');
    expect(html).toContain('/setting/settings/token');
    expect(html).toContain('通知通道');
    expect(html).toContain('/alert/notice');
    expect(html).toContain('模板与插件');
    expect(html).toContain('/setting/define · /setting/plugins');
    expect(html).toContain('未来大域边界');
    expect(html).toContain('仅规划');
    expect(html).toContain('安全治理');
    expect(html).toContain('路线图能力规划');
    expect(html).toContain('/docs/roadmap/future-security');
    expect(html).not.toContain('href="/security"');
  });
});
