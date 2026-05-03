import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityPageHeader } from './page-header';

describe('observability page header', () => {
  it('uses the shared cold-workbench header tokens for operator pages', () => {
    const html = renderToStaticMarkup(
      <ObservabilityPageHeader
        tone="operator"
        breadcrumbs={<span>Overview / Trace</span>}
        kicker="Trace Center"
        title="Trace manage"
        subtitle="Inspect spans and timeline evidence."
        actions={<button>Refresh</button>}
      />
    );

    expect(html).toContain('border-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).toContain('text-[22px] font-semibold');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).not.toContain('text-white/94');
    expect(html).not.toContain('#f3eee6');
  });

  it('can render compact fact pills for operator pages', () => {
    const html = renderToStaticMarkup(
      <ObservabilityPageHeader
        tone="operator"
        kicker="告警中心"
        title="集中查看并处理当前告警"
        subtitle="按时间、状态和对象筛选告警。"
        facts={[
          { label: '全部告警组', value: '0' },
          { label: '告警中', value: '0' },
          { label: '已确认', value: '0' },
          { label: '已恢复', value: '0' }
        ]}
        factsVariant="pills"
      />
    );

    expect(html).toContain('data-observability-stat-grid="pills"');
    expect(html).toContain('rounded-[8px]');
    expect(html).toContain('全部告警组');
    expect(html).toContain('告警中');
    expect(html).not.toContain('divide-x');
    expect(html).not.toContain('border-y');
  });

  it('can render a plain text kicker while keeping the bordered operator header', () => {
    const html = renderToStaticMarkup(
      <ObservabilityPageHeader
        tone="operator"
        kickerVariant="plain"
        kicker="对象优先调查"
        title="导入实体定义"
        subtitle="支持一次导入多个定义。"
      />
    );

    expect(html).toContain('data-observability-kicker="plain"');
    expect(html).toContain('对象优先调查');
    expect(html).toContain('border-b border-[var(--ops-border-color)]');
    expect(html).not.toContain('data-badge');
  });
});
