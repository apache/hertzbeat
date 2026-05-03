import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PassportPanel, PassportShell } from './passport-shell';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => <img alt={alt} src={src} {...props} />
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock(),
    locale: 'zh-CN',
    locales: [
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' }
    ],
    setLocale: vi.fn()
  })
}));

vi.mock('../shell/locale-option-list', () => ({
  LocaleOptionList: () => <div data-locale-options="true">locale-options</div>
}));

vi.mock('../shell/platform-copyright-footer', () => ({
  PlatformCopyrightFooter: ({
    children,
    headlineClassName,
    innerClassName: _innerClassName,
    lineClassName,
    linkClassName,
    version,
    ...props
  }: any) => (
    <footer {...props}>
      <div className={headlineClassName}>Apache HertzBeat™{version ? ` ${version}` : ''}</div>
      <a className={linkClassName}>Apache HertzBeat™</a>
      <div className={lineClassName}>{children ?? 'Licensed under the Apache License, Version 2.0'}</div>
    </footer>
  )
}));

describe('PassportShell', () => {
  it('renders the shared auth shell and panel structure on the cold-workbench baseline', () => {
    const html = renderToStaticMarkup(
      <PassportShell panelClassName="max-w-[368px]">
        <PassportPanel title="Sign In HertzBeat">
          <form data-passport-form="true">
            <input />
          </form>
        </PassportPanel>
      </PassportShell>
    );

    expect(html).toContain('data-passport-shell="true"');
    expect(html).toContain('data-passport-shell-spacing="angular-reference"');
    expect(html).toContain('data-passport-brand-lockup="angular-lowered"');
    expect(html).toContain('data-passport-content-alignment="angular-centered"');
    expect(html).toContain('data-passport-content-gutter="angular-right-shift"');
    expect(html).toContain('data-passport-vertical-position="angular-upper-content"');
    expect(html).toContain('data-passport-hero-offset="angular-left-reference"');
    expect(html).toContain('data-passport-background-overlay="angular-light"');
    expect(html).toContain('data-passport-locale-trigger="globe"');
    expect(html).toContain('data-passport-locale-tone="angular-magenta"');
    expect(html).toContain('data-passport-intro-list="angular-single-column"');
    expect(html).toContain('data-passport-intro-bullet-tone="angular-cyan"');
    expect(html).toContain('data-passport-intro-separator="top"');
    expect(html).toContain('data-passport-intro-separator="bottom"');
    expect(html).toContain('data-passport-panel="true"');
    expect(html).toContain('data-passport-form="true"');
    expect(html).toContain('data-passport-footer-tone="angular-muted"');
    expect(html).toContain('data-passport-footer-band="angular-raised"');
    expect(html).toContain('/assets/bg.png');
    expect(html).toContain('Apache HertzBeat™ v1.8.0');
    expect(html).toContain('Licensed under the Apache License, Version 2.0');
  });

  it('removes the remaining bright auth shell residue and adopts ops tokens', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/passport-shell.tsx'), 'utf8');

    expect(source).not.toContain('bg-[#f0f2f5]');
    expect(source).not.toContain('text-[hsl(var(--foreground))]');
    expect(source).not.toContain('text-white/92');
    expect(source).not.toContain('hover:bg-white/10');
    expect(source).not.toContain('border-white/20');
    expect(source).not.toContain('text-white/88');
    expect(source).not.toContain('text-white/66');
    expect(source).not.toContain('text-white/84');
    expect(source).not.toContain('bg-white/95');
    expect(source).not.toContain('text-white/80');
    expect(source).not.toContain('border-[#d692e3]');
    expect(source).not.toContain('border-[#4f4653]');
    expect(source).not.toContain('bg-[rgba(198,189,189,0.39)]');
    expect(source).not.toContain('shadow-[7px_5px_0_#b421cc]');
    expect(source).not.toContain('text-[#2f3a51]');

    expect(source).toContain('bg-[var(--ops-background)]');
    expect(source).toContain('text-[var(--ops-text-primary)]');
    expect(source).toContain('border-[var(--ops-border-color)]');
    expect(source).toContain('text-[var(--ops-text-secondary)]');
    expect(source).toContain('text-[var(--ops-primary)]');
    expect(source).toContain("from '../workbench/primitives'");
    expect(source).toContain('WorkbenchPanel');
    expect(source).toContain('data-passport-locale-trigger="globe"');
    expect(source).toContain('data-passport-locale-tone="angular-magenta"');
    expect(source).toContain('text-[#d11ce6]');
    expect(source).toContain('data-passport-background-overlay="angular-light"');
    expect(source).toContain('data-passport-intro-list="angular-single-column"');
    expect(source).toContain('data-passport-intro-bullet-tone="angular-cyan"');
    expect(source).toContain('bg-[#13c8ff]');
    expect(source).toContain('version="v1.8.0"');
    expect(source).toContain('data-passport-footer-tone="angular-muted"');
    expect(source).toContain('data-passport-shell-spacing="angular-reference"');
    expect(source).toContain('data-passport-brand-lockup="angular-lowered"');
    expect(source).toContain('data-passport-content-alignment="angular-centered"');
    expect(source).toContain('data-passport-content-gutter="angular-right-shift"');
    expect(source).toContain('data-passport-vertical-position="angular-upper-content"');
    expect(source).toContain('data-passport-hero-offset="angular-left-reference"');
    expect(source).toContain('data-passport-footer-band="angular-raised"');
    expect(source).toContain('pt-10 pb-3');
    expect(source).toContain('translate-y-2');
    expect(source).toContain('lg:translate-x-3');
    expect(source).toContain('min-h-[calc(100vh-4.25rem)]');
    expect(source).toContain('pt-4 lg:translate-x-3 lg:gap-24 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)]');
    expect(source).not.toContain('min-h-[calc(100vh-1.5rem)]');
    expect(source).not.toContain('pt-8 lg:gap-24 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)]');
    expect(source).toContain('lg:pl-[15%]');
    expect(source).not.toContain('lg:pl-[10%]');
    expect(source).toContain('headlineClassName="text-[rgba(74,54,70,0.84)]"');
    expect(source).toContain('lineClassName="text-[rgba(74,54,70,0.82)]"');
    expect(source).toContain('linkClassName="text-[#0097d7]"');
    expect(source).not.toContain('WorkbenchActionButton');
    expect(source).not.toContain('rgba(11,12,14,0.76)');
    expect(source).not.toContain('rgba(11,12,14,0.94)');
    expect(source).not.toContain('lg:grid-cols-2');
    expect(source).not.toContain('lg:max-h-[260px]');
    expect(source).not.toContain('inline-flex h-9 items-center gap-2 rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 text-[12px] text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] hover:text-[var(--ops-text-primary)]');
  });
});
