import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn()
  })
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

describe('log integration redirect shell', () => {
  it('renders the shared placeholder shell with HertzBeat OTLP intake and manage CTAs', async () => {
    const { LogIntegrationRedirectShell } = await import('./log-integration-redirect-shell');
    const html = renderToStaticMarkup(
      <LogIntegrationRedirectShell
        ingestionHref="/ingestion/otlp?signal=logs"
        manageHref="/log/manage"
      />
    );

    expect(html).toContain('data-parity-app-shell="true"');
    expect(html).toContain('data-parity-app-header="true"');
    expect(html).toContain('data-parity-placeholder-shell="true"');
    expect(html).toContain('日志接入已合并到可观测接入');
    expect(html).toContain('前往可观测接入');
    expect(html).toContain('前往日志工作台');
    expect(html).not.toContain('Observability Intake');
  });

  it('keeps the client-side auto-navigation contract pointed at the intake route', () => {
    const source = readFileSync(path.join(import.meta.dirname, 'log-integration-redirect-shell.tsx'), 'utf8');

    expect(source).toContain('useEffect(() => {');
    expect(source).toContain('router.replace(ingestionHref);');
  });
});
