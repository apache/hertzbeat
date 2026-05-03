import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ alt, priority: _priority, ...props }: React.ComponentProps<'img'> & { priority?: boolean }) => (
    <img alt={alt} {...props} />
  )
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => `translated:${key}`,
    locale: 'en-US',
    locales: ['en-US', 'zh-CN'],
    setLocale: vi.fn(async () => undefined)
  })
}));

vi.mock('@/components/shell/locale-option-list', () => ({
  LocaleOptionList: () => <div data-locale-option-list="true" />
}));

vi.mock('@/components/shell/auth-gate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/components/shell/app-sidebar', () => ({
  AppSidebar: () => <aside data-app-sidebar="true">sidebar</aside>
}));

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn()
}));

vi.mock('@/lib/app-frame-state', () => ({
  isStandaloneRoute: () => false,
  shouldLoadHeaderState: () => false
}));

vi.mock('@/lib/alert-manage/query-state', () => ({
  buildAlertListUrl: () => '/alert'
}));

vi.mock('@/lib/passport-login/controller', () => ({
  buildLoginRedirectHref: () => '/passport/login'
}));

vi.mock('@/lib/workbench-theme', () => ({
  bootstrapWorkbenchTheme: vi.fn()
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}));

describe('app frame chrome', () => {
  it('does not keep the startup baseline once live header setup state resolves empty', async () => {
    const { buildSetupSummary } = await import('./app-frame');
    const summary = buildSetupSummary(
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.headline).toBe('layout.setup.progress.headline:0');
  });

  it('keeps the startup setup baseline on the entity create route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/entities/new',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('layout.setup.progress.headline:83');
  });

  it('keeps the startup setup baseline on the entity import route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/entities/import',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('layout.setup.progress.headline:83');
  });

  it('keeps the startup setup baseline on the entity discovery route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/entities/discovery',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('layout.setup.progress.headline:83');
  });

  it('keeps the startup setup baseline on overview routes when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const t = (key: string, params?: Record<string, string | number | null | undefined>) =>
      params?.percent != null ? `${key}:${params.percent}` : key;
    const emptyState = {
      monitorTotal: 0,
      collectorTotal: 0,
      entityTotal: 0,
      hasEvidenceLinked: false,
      definitionCount: 0,
      governanceCount: 0
    };

    for (const pathname of ['/overview', '/dashboard']) {
      const summary = buildRouteSetupSummary(pathname, emptyState, t);

      expect(summary.completedCount).toBe(5);
      expect(summary.progressPercent).toBe(83);
      expect(summary.headline).toBe('layout.setup.progress.headline:83');
    }
  });

  it('keeps the startup setup baseline on dark-ops compatibility routes when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const t = (key: string, params?: Record<string, string | number | null | undefined>) =>
      params?.percent != null ? `${key}:${params.percent}` : key;
    const emptyState = {
      monitorTotal: 0,
      collectorTotal: 0,
      entityTotal: 0,
      hasEvidenceLinked: false,
      definitionCount: 0,
      governanceCount: 0
    };

    for (const pathname of ['/incidents', '/actions']) {
      const summary = buildRouteSetupSummary(pathname, emptyState, t);

      expect(summary.completedCount).toBe(5);
      expect(summary.progressPercent).toBe(83);
      expect(summary.headline).toBe('layout.setup.progress.headline:83');
    }
  });

  it('keeps the startup setup baseline on the log stream compatibility route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/log/stream',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('layout.setup.progress.headline:83');
  });

  it('keeps the startup setup baseline on the OTLP intake route when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/ingestion/otlp',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('layout.setup.progress.headline:83');
  });

  it('keeps the startup setup baseline on entity definition routes when the live setup state is empty', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/entities/1/definition',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(5);
    expect(summary.progressPercent).toBe(83);
    expect(summary.headline).toBe('layout.setup.progress.headline:83');
  });

  it('keeps the live empty setup state on the entity edit route', async () => {
    const { buildRouteSetupSummary } = await import('./app-frame');
    const summary = buildRouteSetupSummary(
      '/entities/1/edit',
      {
        monitorTotal: 0,
        collectorTotal: 0,
        entityTotal: 0,
        hasEvidenceLinked: false,
        definitionCount: 0,
        governanceCount: 0
      },
      (key: string, params?: Record<string, string | number | null | undefined>) =>
        params?.percent != null ? `${key}:${params.percent}` : key
    );

    expect(summary.completedCount).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.headline).toBe('layout.setup.progress.headline:0');
  });

  it('renders shared header utility triggers with icon-only parity chrome on ops routes', async () => {
    const { AppFrame } = await import('./app-frame');

    const html = renderToStaticMarkup(
      <AppFrame>
        <div>overview-body</div>
      </AppFrame>
    );

    expect(html).toContain('data-app-frame-icon-trigger="github"');
    expect(html).toContain('data-app-frame-icon-trigger="menu"');
    expect(html).toContain('data-app-frame-icon-trigger="notify"');
    expect(html).toContain('data-app-frame-icon-trigger="mute"');
    expect(html).toContain('data-app-frame-icon-trigger="lock"');
    expect(html).toContain('data-app-frame-icon-trigger="settings"');
    expect(html).toContain('data-app-frame-icon-trigger="user"');
    expect(html).toContain('data-app-frame-glyph="notify-bell"');
    expect(html).toContain('data-app-frame-glyph="mute-megaphone"');
    expect(html).toContain('data-app-frame-glyph="settings-gear"');
    expect(html).toContain('data-app-frame-user-avatar="angular-circle"');
    expect(html).toContain('translated:layout.setup.title');
    expect(html).toContain('data-app-frame-setup-progress="angular-reference"');
    expect(html).toContain('style="width:83%"');
    expect(html).not.toContain('translated:common.setup');
    expect(html).toContain('data-platform-footer="angular-footer"');
    expect(html).toContain('class="relative min-w-0 self-start"');
    expect(html).toContain('Apache HertzBeat™ v1.8.0');
    expect(html).toContain('Licensed under the Apache License, Version 2.0');
    expect(html).toContain('data-shell-help-launcher="angular-help"');
    expect(html).toContain('class="sr-only">translated:common.help</span>');
    expect(html).toContain('class="sr-only">GitHub</span>');
    expect(html).toContain('class="sr-only">Menu</span>');
    expect(html).toContain('class="sr-only">translated:common.notify</span>');
    expect(html).toContain('class="sr-only">translated:common.mute</span>');
    expect(html).toContain('class="sr-only">translated:common.lock</span>');
    expect(html).toContain('class="sr-only">translated:menu.settings</span>');
    expect(html).toContain('class="sr-only">admin</span>');
    expect(html).toContain('overview-body');
  });

  it('lets OTLP metrics remove the app-frame padding shell instead of nesting another workbench layer', async () => {
    const { buildContentFrameClassName, buildContentFrameShellKind } = await import('./app-frame');

    expect(buildContentFrameShellKind('/overview')).toBe('standard');
    expect(buildContentFrameClassName('/overview')).toBe('px-4 pb-3 pt-4 sm:px-6');

    expect(buildContentFrameShellKind('/ingestion/otlp/metrics')).toBe('flat-workbench');
    expect(buildContentFrameShellKind('/ingestion/otlp/metrics?timeRange=last-30m')).toBe('flat-workbench');
    expect(buildContentFrameClassName('/ingestion/otlp/metrics')).toBe('px-0 pb-3 pt-0 sm:px-0');
    expect(buildContentFrameClassName('/ingestion/otlp/metrics')).not.toContain('px-4');
    expect(buildContentFrameClassName('/ingestion/otlp/metrics')).not.toContain('pt-4');
  });
});
