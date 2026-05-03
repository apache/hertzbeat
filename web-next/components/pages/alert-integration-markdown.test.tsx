import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AlertIntegrationMarkdown } from './alert-integration-markdown';

describe('AlertIntegrationMarkdown', () => {
  it('renders fenced code, indented fenced code, links, and mermaid diagrams without exposing raw fences', () => {
    const html = renderToStaticMarkup(
      <AlertIntegrationMarkdown
        content={`# 指南

请查看 [Prometheus 文档](https://prometheus.io/docs/alerting/latest/configuration/)。

\`\`\`json
{"status":"ok"}
\`\`\`

\`\`\`mermaid
graph LR
  A[外部系统告警] --> B[Webhook]
\`\`\`

1. 检查配置
    \`\`\`bash
    curl http://localhost:9090/api/v1/rules
    \`\`\`
`}
      />
    );

    expect(html).toContain('data-alert-integration-markdown="rendered"');
    expect(html).toContain('data-alert-integration-code-block="json"');
    expect(html).toContain('data-alert-integration-code-block="bash"');
    expect(html).toContain('data-alert-integration-markdown-list="ordered"');
    expect(html).toContain('data-alert-integration-mermaid="pending"');
    expect(html).toContain('href="https://prometheus.io/docs/alerting/latest/configuration/"');
    expect(html).toContain('curl http://localhost:9090/api/v1/rules');
    expect(html).not.toContain('```json');
    expect(html).not.toContain('```bash');
    expect(html).not.toContain('```mermaid');
    expect(html).not.toContain('graph LR');
    expect(html).not.toContain('data-language="mermaid"');
  });

  it('renders provider markdown headings, emphasis, blockquotes, and pipe tables instead of leaking raw syntax', () => {
    const html = renderToStaticMarkup(
      <AlertIntegrationMarkdown
        content={`>将 Zabbix 的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

#### 进入通知模板配置
2. 进入 **告警管理** > **告警配置** > **通知模板**

| 名称 | 值 |
|-----|-----|
| URL | http://your-hertzbeat-server:1157/api/alerts/report/zabbix |
| TriggerSeverity | {TRIGGER.SEVERITY} |
`}
      />
    );

    expect(html).toContain('data-alert-integration-markdown-heading="4"');
    expect(html).toContain('data-alert-integration-markdown-quote="true"');
    expect(html).toContain('data-alert-integration-markdown-table="true"');
    expect(html).toContain('<strong');
    expect(html).toContain('告警管理');
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
    expect(html).toContain('TriggerSeverity');
    expect(html).not.toContain('####');
    expect(html).not.toContain('**告警管理**');
    expect(html).not.toContain('| 名称 | 值 |');
    expect(html).not.toContain('|-----|-----|');
    expect(html).not.toContain('&gt;将 Zabbix');
  });

  it('renders the real alert integration provider docs without leaking heading, emphasis, table, or fence syntax', () => {
    const docs = ['tencent', 'zabbix', 'prometheus'].map(source => ({
      source,
      content: readFileSync(resolve(process.cwd(), '..', 'web-app', 'src', 'assets', 'doc', 'alert-integration', `${source}.zh-CN.md`), 'utf8')
    }));

    for (const { source, content } of docs) {
      const html = renderToStaticMarkup(<AlertIntegrationMarkdown content={content} />);

      expect(html, source).toContain('data-alert-integration-markdown="rendered"');
      expect(html, source).toContain('data-alert-integration-markdown-heading="3"');
      if (content.includes('**')) {
        expect(html, source).toContain('data-alert-integration-markdown-strong="true"');
      }
      expect(html, source).not.toContain('####');
      expect(html, source).not.toContain('**告警');
      expect(html, source).not.toContain('```');
    }

    const zabbixHtml = renderToStaticMarkup(<AlertIntegrationMarkdown content={docs.find(doc => doc.source === 'zabbix')!.content} />);
    expect(zabbixHtml).toContain('data-alert-integration-markdown-table="true"');
    expect(zabbixHtml).not.toContain('| 名称 | 值 |');

    const prometheusHtml = renderToStaticMarkup(<AlertIntegrationMarkdown content={docs.find(doc => doc.source === 'prometheus')!.content} />);
    expect(prometheusHtml).toContain('data-alert-integration-code-block="bash"');
    expect(prometheusHtml).toContain('data-alert-integration-code-block="yaml"');
  });
});
