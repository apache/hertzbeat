import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();
const headers = vi.fn();

const mockLoadIntegrationDoc = vi.hoisted(() =>
  vi.fn(
    async () => `# Webhook guide

Use this provider.

\`\`\`json
{"status":"ok"}
\`\`\`

\`\`\`mermaid
graph LR
  A[External alert] --> B[Webhook]
\`\`\`

1. Check configuration
    \`\`\`bash
    curl http://localhost:9090/api/v1/rules
    \`\`\`
`
  )
);

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  redirect
}));

vi.mock('next/headers', () => ({
  headers
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  WorkbenchPage: ({ title, subtitle, facts, actions, main, side, tone }: any) => (
    <main data-workbench-page="true" data-tone={tone}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-facts="true">{facts.map((fact: any) => `${fact.label}:${fact.value}`).join('|')}</div>
      <div data-actions="true">{actions}</div>
      <div data-main="true">{main}</div>
      <div data-side="true">{side}</div>
    </main>
  ),
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => `${row.title}||${row.copy}||${row.meta}`).join('|')}</div>
}));

vi.mock('@/components/observability', () => ({
  DrawerCodePreview: ({ children }: any) => <pre data-drawer-code-preview="true">{children}</pre>,
  DrawerSection: ({ title, children }: any) => (
    <aside data-drawer-section={title}>
      <h3>{title}</h3>
      {children}
    </aside>
  ),
  StageSection: ({ title, description, children }: any) => (
    <section data-stage-section={title}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/lib/utils', () => ({
  cn: (...inputs: Array<string | false | null | undefined>) => inputs.filter(Boolean).join(' ')
}));

vi.mock('@/lib/alert-integration/controller', () => ({
  fallbackDocCopy: 'No integration guide is available for this provider yet.',
  getAlertIntegrationFallbackDocCopy: () => 'No integration guide is available for this alert source yet.',
  loadIntegrationDoc: mockLoadIntegrationDoc
}));

vi.mock('@/lib/alert-integration/view-model', () => ({
  DATA_SOURCES: [
    { id: 'webhook', name: 'Default Webhook', icon: '/assets/logo.svg' },
    { id: 'prometheus', name: 'Prometheus', icon: '/assets/img/integration/prometheus.svg' }
  ],
  buildAlertIntegrationSourceHref: (source: any) => `/alert/integration/${source.id}`,
  getIntegrationSource: (source: string) =>
    [
      { id: 'webhook', name: 'Default Webhook', icon: '/assets/logo.svg' },
      { id: 'prometheus', name: 'Prometheus', icon: '/assets/img/integration/prometheus.svg' }
    ].find(item => item.id === source) ?? { id: 'webhook', name: 'Default Webhook', icon: '/assets/logo.svg' },
  createAlertIntegrationTranslator: () => (key: string) =>
    ({
      'alert.integration.kicker': 'Alert integration',
      'alert.integration.sources': 'Integration alert sources',
      'alert.integration.token.manage': 'Manage tokens'
    })[key] ?? key,
  getIntegrationSourceName: (item: any) => item.name ?? item.id,
  translateAlertIntegration: (key: string) =>
    ({
      'alert.integration.kicker': 'Alert integration',
      'alert.integration.sources': 'Integration alert sources',
      'alert.integration.token.manage': 'Manage tokens'
    })[key] ?? key,
  buildIntegrationFacts: (source: string, hasDoc: boolean) => [
    { label: 'Alert integration', value: `alert/integration/${source}` },
    { label: 'Integration alert sources', value: source },
    { label: 'Document status', value: hasDoc ? 'Loaded' : 'Fallback copy' }
  ],
  buildIntegrationSourceRows: (source: string) => [
    { title: 'Default Webhook', copy: 'webhook', meta: source === 'webhook' ? 'selected' : '/alert/integration/webhook' },
    { title: 'Prometheus', copy: 'prometheus', meta: source === 'prometheus' ? 'selected' : '/alert/integration/prometheus' }
  ],
  buildIntegrationPostureRows: (source: string, hasDoc: boolean) => [
    { title: 'doc source', copy: `web-next/public/assets/doc/alert-integration/${source}.*.md`, meta: 'existing asset' },
    { title: 'fallback behavior', copy: hasDoc ? 'provider doc loaded' : 'show fallback copy when no provider doc exists', meta: 'behavior preserved' },
    { title: 'token management', copy: 'Continue to use the current token management entry point.', meta: '/setting/settings/token' }
  ]
}));

describe('alert integration page', () => {
  it('renders the shared HertzBeat UI source rail plus markdown document shell for the selected integration source', async () => {
    headers.mockResolvedValue(new Headers({ 'accept-language': 'zh-CN,zh;q=0.9' }));
    const source = readFileSync(resolve(process.cwd(), 'app/alert/integration/[source]/page.tsx'), 'utf8');
    const { default: AlertIntegrationPage } = await import('./page');
    const html = renderToStaticMarkup(
      await AlertIntegrationPage({
        params: Promise.resolve({ source: 'webhook' })
      })
    );

    expect(html).toContain('data-alert-integration-surface="hertzbeat-ui-source-doc"');
    expect(html).toContain('data-alert-integration-shell-owner="hertzbeat-ui-source-doc-shell"');
    expect(html).toContain('data-hz-ui="source-doc-shell"');
    expect(html).toContain('data-hz-source-doc-shell-owner="hertzbeat-ui-source-doc-shell"');
    expect(html).toContain('data-hz-source-doc-rail-owner="hertzbeat-ui-source-doc-shell"');
    expect(html).toContain('data-hz-source-doc-panel-owner="hertzbeat-ui-source-doc-shell"');
    expect(html).toContain('data-alert-integration-token-action-owner="hertzbeat-ui-button-link"');
    expect(html).toContain('data-alert-integration-source-item="webhook"');
    expect(html).toContain('data-alert-integration-source-selected="true"');
    expect(html).toContain('data-alert-integration-source-icon="webhook"');
    expect(html).toContain('data-hz-source-doc-item-owner="hertzbeat-ui-source-doc-shell"');
    expect(html).toContain('data-hz-source-doc-item-icon-owner="hertzbeat-ui-source-doc-shell"');
    expect(html).toContain('src="/assets/logo.svg"');
    expect(html).toContain('src="/assets/img/integration/prometheus.svg"');
    expect(html).toContain('data-hz-source-doc-panel-scroll-owner="hertzbeat-ui-scroll-viewport"');
    expect(html).toContain('data-alert-integration-markdown="rendered"');
    expect(html).toContain('data-alert-integration-code-block="json"');
    expect(html).toContain('data-alert-integration-code-block="bash"');
    expect(html).toContain('data-alert-integration-mermaid="pending"');
    expect(html).toContain('Alert integration');
    expect(html).toContain('Integration alert sources');
    expect(html).toContain('Default Webhook');
    expect(html).toContain('Manage tokens');
    expect(html).toContain('Webhook guide');
    expect(html).toContain('curl http://localhost:9090/api/v1/rules');
    expect(mockLoadIntegrationDoc).toHaveBeenLastCalledWith(expect.stringContaining('alert-integration'), 'webhook', 'zh-CN');
    expect(html).not.toContain('# Webhook guide');
    expect(html).not.toContain('```json');
    expect(html).not.toContain('```bash');
    expect(html).not.toContain('```mermaid');
    expect(html).not.toContain('graph LR');
    expect(html).not.toContain('data-language="mermaid"');
    expect(html).not.toContain('angular-source-doc');
    expect(html).not.toContain('angular-source-list');
    expect(html).not.toContain('angular-markdown-doc');
    expect(html).not.toContain('angular-token-action');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('Integration · Webhook');
    expect(html).not.toContain('Workspace:alert/integration/webhook');
    expect(html).not.toContain('Open Token Management');
    expect(html).not.toContain('Integration guide');
    expect(html).not.toContain('Integration posture');
    expect(html).not.toContain('Sources');
    expect(html).not.toContain('Navigation');

    expect(source).toContain("from '@hertzbeat/ui/source-doc-shell'");
    expect(source).toContain('HzSourceDocShell');
    expect(source).toContain("from 'next/headers'");
    expect(source).toContain('createAlertIntegrationTranslator(locale)');
    expect(source).toContain('loadIntegrationDoc(baseDir, selectedSource.id, locale)');
    expect(source).toContain('data-alert-integration-surface="hertzbeat-ui-source-doc"');
    expect(source).toContain('data-alert-integration-shell-owner="hertzbeat-ui-source-doc-shell"');
    expect(source).not.toContain('h-[calc(100vh-242px)]');
    expect(source).toContain("'data-alert-integration-source-icon': item.id");
    expect(source).toContain('AlertIntegrationMarkdown');
    expect(source).not.toContain('No integration guide is available for this provider yet.');
    expect(source).not.toContain('angular-source-doc');
    expect(source).not.toContain('angular-source-list');
    expect(source).not.toContain('angular-markdown-doc');
    expect(source).not.toContain('angular-token-action');
    expect(source).not.toContain('rounded-[10px]');
    expect(source).not.toContain('rounded-[8px]');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('hzOpsCatalogVisual');
    expect(source).not.toContain("from '@/components/ui/button'");
    expect(source).not.toContain("from '@/components/observability'");
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('DrawerCodePreview');
    expect(source).not.toContain('buildIntegrationFacts');
    expect(source).not.toContain('buildIntegrationPostureRows');
    expect(source).not.toContain("from '@/components/workbench/primitives'");
    expect(source).not.toContain("from '@/components/observability/code-pane'");
  });

  it('redirects unknown source params to the canonical default source route', async () => {
    headers.mockResolvedValue(new Headers({ 'accept-language': 'zh-CN' }));
    redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });

    const { default: AlertIntegrationPage } = await import('./page');

    await expect(
      AlertIntegrationPage({
        params: Promise.resolve({ source: 'unknown-provider' })
      })
    ).rejects.toThrow('redirect:/alert/integration/webhook');
    expect(redirect).toHaveBeenLastCalledWith('/alert/integration/webhook');
  });
});
