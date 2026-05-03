import { describe, expect, it, vi } from 'vitest';
import { buildAlertNoticeEvidenceContext, buildNoticeFacts, buildNoticeLaneRows, buildNoticeMetrics, buildNoticeReceiverDraft, buildNoticeReceiverRows, buildNoticeRuleRows, buildNoticeTemplateDraft, buildNoticeTemplateRows, getNoticeReceiverVisibleFieldKeys, validateNoticeReceiverDraft, validateNoticeRuleDraft, validateNoticeTemplateDraft } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({
  overrides: {
    'alert.notice.receivers.title': 'Receivers',
    'alert.notice.rules.title': 'Rules',
    'alert.notice.templates.title': 'Templates',
    'alert.notice.lanes.receivers.title': 'Receivers',
    'alert.notice.lanes.rules.title': 'Rules',
    'alert.notice.lanes.templates.title': 'Templates'
  }
});
const zhT = createTranslatorMock({
  locale: 'zh-CN',
  overrides: {
    'alert.notice.receivers.title': '接收人',
    'alert.notice.rules.title': '规则',
    'alert.notice.templates.title': '模板',
    'alert.notice.lanes.receivers.title': '接收人',
    'alert.notice.lanes.rules.title': '规则',
    'alert.notice.lanes.templates.title': '模板'
  }
});

describe('alert notice view model', () => {
  it('builds notice facts', () => {
    expect(
      buildNoticeFacts(
        { totalElements: 3 } as any,
        { totalElements: 4 } as any,
        { totalElements: 5 } as any,
        t
      )
    ).toEqual([
      { label: 'Workspace', value: 'alert/notice' },
      { label: 'Receivers', value: '3' },
      { label: 'Rules', value: '4' },
      { label: 'Templates', value: '5' }
    ]);
  });

  it('builds notice metrics', () => {
    expect(
      buildNoticeMetrics(
        { content: [1, 2] } as any,
        { content: [1] } as any,
        { content: [{ preset: true }, { preset: false }] } as any,
        t,
        'en-US'
      )
    ).toEqual([
      { label: 'Visible receivers', value: '2' },
      { label: 'Visible policies', value: '1' },
      { label: 'Preset templates', value: '1', tone: 'success' }
    ]);
  });

  it('localizes notice metrics and lane copy for chinese workspaces', () => {
    expect(
      buildNoticeMetrics(
        { content: [1, 2] } as any,
        { content: [1] } as any,
        { content: [{ preset: true }, { preset: false }] } as any,
        zhT,
        'zh-CN'
      )
    ).toEqual([
      { label: '当前接收对象', value: '2' },
      { label: '当前通知策略', value: '1' },
      { label: '预置模板', value: '1', tone: 'success' }
    ]);

    expect(
      buildNoticeLaneRows(
        { totalElements: 3, content: [1, 2] } as any,
        { totalElements: 4, content: [1] } as any,
        { totalElements: 5, content: [{ preset: true }] } as any,
        zhT,
        'zh-CN'
      )
    ).toEqual([
      { title: '接收人', copy: '管理告警发往哪些接收对象。', meta: '共 3 个 · 当前 2 个' },
      { title: '规则', copy: '按标签、时间段和模板自动路由通知。', meta: '共 4 个 · 当前 1 个' },
      { title: '模板', copy: '以纯文本摘要预览模板，不暴露原始 HTML 或模板源码。', meta: '共 5 个 · 当前 1 个' }
    ]);
  });

  it('builds receiver rows', () => {
    expect(
      buildNoticeReceiverRows(
        [
          { name: 'ops-email', email: 'ops@example.com', type: 'EMAIL', gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00',
        'en-US'
      )
    ).toEqual([
      { key: 'ops-email', title: 'ops-email', copy: 'ops@example.com', meta: 'Email · Updated 2026-04-10 18:00:00' }
    ]);
  });

  it('surfaces channel-specific receiver previews for non generic types', () => {
    expect(
      buildNoticeReceiverRows(
        [
          {
            name: 'pager-telegram',
            type: 7,
            tgBotToken: 'bot-token-123',
            tgUserId: 'user-456',
            gmtUpdate: 1712730000000
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00',
        'en-US'
      )
    ).toEqual([
      { key: 'pager-telegram', title: 'pager-telegram', copy: 'bot-token-123 · user-456', meta: 'Telegram bot · Updated 2026-04-10 18:00:00' }
    ]);
  });

  it('builds and validates receiver drafts', () => {
    expect(buildNoticeReceiverDraft({ id: 7, name: 'ops-email', type: 1, email: 'ops@example.com', hookAuthType: 'Basic', slackWebHookUrl: 'https://hooks.slack.example' } as any)).toMatchObject({
      id: 7,
      name: 'ops-email',
      type: '1',
      email: 'ops@example.com',
      phone: '',
      hookUrl: '',
      hookAuthType: 'Basic',
      hookAuthToken: '',
      wechatId: '',
      accessToken: '',
      tgBotToken: '',
      tgUserId: '',
      tgMessageThreadId: '',
      larkReceiveType: '0',
      userId: '',
      chatId: '',
      slackWebHookUrl: 'https://hooks.slack.example',
      corpId: '',
      agentId: '',
      appSecret: '',
      partyId: '',
      tagId: '',
      discordChannelId: '',
      discordBotToken: '',
      smnAk: '',
      smnSk: '',
      smnProjectId: '',
      smnRegion: '',
      smnTopicUrn: '',
      serverChanToken: '',
      gotifyToken: '',
      appId: ''
    });

    expect(getNoticeReceiverVisibleFieldKeys({ ...buildNoticeReceiverDraft(null), type: '2', hookAuthType: 'None' })).toEqual(['hookUrl', 'hookAuthType']);
    expect(getNoticeReceiverVisibleFieldKeys({ ...buildNoticeReceiverDraft(null), type: '2', hookAuthType: 'Basic' })).toEqual(['hookUrl', 'hookAuthType', 'hookAuthToken']);
    expect(getNoticeReceiverVisibleFieldKeys({ ...buildNoticeReceiverDraft(null), type: '14', larkReceiveType: '1' })).toEqual(['appId', 'appSecret', 'larkReceiveType', 'chatId']);

    expect(validateNoticeReceiverDraft(buildNoticeReceiverDraft(null), t)).toBe('Receiver name is required');
    expect(validateNoticeReceiverDraft({ ...buildNoticeReceiverDraft(null), name: 'ops-email', type: '2', hookAuthType: 'None', hookUrl: '' }, t)).toBe('Webhook URL is required');
    expect(
      validateNoticeReceiverDraft(
        { ...buildNoticeReceiverDraft(null), name: 'ops-email', type: '14', appId: 'lark-app', appSecret: 'secret', larkReceiveType: '0', userId: '', chatId: '', partyId: '' },
        t
      )
    ).toBe('User ID is required');
    expect(validateNoticeReceiverDraft({ ...buildNoticeReceiverDraft(null), name: 'ops-email', type: '1', email: 'ops@example.com' }, t)).toBeNull();
  });

  it('builds and validates template drafts', () => {
    expect(buildNoticeTemplateRows([{
      id: 9,
      name: 'Email default',
      preset: true,
      content: '<!DOCTYPE html><!-- Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. --><html><body><h1>Alert Summary</h1><p>Disk full on node-01</p></body></html>',
      gmtUpdate: 1712730000000
    }] as any, t, () => '2026-04-10 18:00:00', 'en-US')).toEqual([
      { key: '9', title: 'Email default', copy: 'Alert Summary Disk full on node-01', meta: 'System Preset · Updated 2026-04-10 18:00:00' }
    ]);

    expect(buildNoticeTemplateDraft({ id: 9, name: 'Email default', type: 1, preset: true, content: 'hello' } as any)).toEqual({
      id: 9,
      name: 'Email default',
      type: '1',
      preset: true,
      content: 'hello'
    });

    expect(buildNoticeTemplateDraft({ id: 10, name: 'Custom template', type: 1, preset: false, content: 'body', creator: 'system' } as any)).toEqual({
      id: 10,
      name: 'Custom template',
      type: '1',
      preset: false,
      content: 'body',
      creator: 'system'
    });

    expect(validateNoticeTemplateDraft(buildNoticeTemplateDraft(null), t)).toBe('Template name is required');
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'Email default' }, t)).toBe('Template content is required');
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'Email default', content: 'hello' }, t)).toBeNull();
  });

  it('keeps plain text template previews readable and bounded', () => {
    const [row] = buildNoticeTemplateRows([{
      id: 10,
      name: 'Plain text',
      preset: false,
      content: 'This is a plain text template preview that should stay readable even when it is long enough to require truncation for the rail list in the workbench shell.',
      gmtUpdate: 1712730000000
    }] as any, t, () => '2026-04-10 18:00:00', 'en-US');

    expect(row).toMatchObject({
      key: '10',
      title: 'Plain text',
      meta: 'User Custom · Updated 2026-04-10 18:00:00'
    });
    expect(row.copy.startsWith('This is a plain text template preview')).toBe(true);
    expect(row.copy.endsWith('...')).toBe(true);
    expect(row.copy.length).toBeLessThanOrEqual(140);
  });

  it('sanitizes html, freemarker, markdown, and json template source into plain text previews', () => {
    const [row] = buildNoticeTemplateRows([{
      id: 11,
      name: 'WebhookTemplate',
      preset: true,
      content: '{"title":"<#if status??>${status!\"UNKNOWN\"}</#if>","summary":"&lt;h1&gt;Alert Summary&lt;/h1&gt; ### ${commonLabels.severity} > ${msg!\"Disk full\"}"}',
      gmtUpdate: 1712730000000
    }] as any, t, () => '2026-04-10 18:00:00', 'en-US');

    expect(row.copy).toContain('UNKNOWN');
    expect(row.copy).toContain('Alert Summary');
    expect(row.copy).toContain('severity');
    expect(row.copy).toContain('Disk full');
    expect(row.copy).not.toContain('${');
    expect(row.copy).not.toContain('<#if');
    expect(row.copy).not.toContain('&lt;');
    expect(row.copy).not.toContain('{');
    expect(row.copy).not.toContain('###');
  });

  it('builds rule rows and validates rule drafts', () => {
    expect(
      buildNoticeRuleRows(
        [{ id: 5, name: 'PagerDuty critical', enable: true, receiverName: ['ops-email'], templateName: 'Default', gmtUpdate: 1712730000000 }] as any,
        t,
        () => '2026-04-10 18:00:00',
        'en-US'
      )
    ).toEqual([
      { key: '5', title: 'PagerDuty critical', copy: 'Enabled · Sending to ops-email', meta: 'Default · Updated 2026-04-10 18:00:00' }
    ]);

    expect(validateNoticeRuleDraft({ name: '', receiverIdsText: '', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '', periodStart: '', periodEnd: '' }, t)).toBe('Rule name is required');
    expect(validateNoticeRuleDraft({ name: 'PagerDuty critical', receiverIdsText: '', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '', periodStart: '', periodEnd: '' }, t)).toBe('Receivers are required');
    expect(validateNoticeRuleDraft({ name: 'PagerDuty critical', receiverIdsText: '1', templateId: '-1', enable: true, filterAll: false, labelsText: '', daysText: '1,2,3,4,5', periodStart: '09:00', periodEnd: '18:00' }, t)).toBe('Labels are required');
    expect(validateNoticeRuleDraft({ name: 'PagerDuty critical', receiverIdsText: '1', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '1,2,3,4,5', periodStart: '09:00', periodEnd: '18:00' }, t)).toBeNull();
  });

  it('builds notice-policy evidence context from a three-signal handoff route', () => {
    const context = buildAlertNoticeEvidenceContext(
      'logs',
      {
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'collector-a',
        template: 'spring-boot',
        returnTo: '/log/manage?traceId=trace-123&returnLabel=Logs'
      },
      zhT
    );

    expect(context).toMatchObject({
      signal: 'logs',
      title: '来自日志的通知策略上下文',
      returnHref: '/log/manage?traceId=trace-123',
      labelsText:
        'hertzbeat.signal:logs, hertzbeat.entity.id:7, service.name:checkout, service.namespace:payments, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:collector-a, hertzbeat.template:spring-boot',
      ruleDraftPatch: {
        filterAll: false,
        labelsText:
          'hertzbeat.signal:logs, hertzbeat.entity.id:7, service.name:checkout, service.namespace:payments, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:collector-a, hertzbeat.template:spring-boot'
      }
    });
    expect(context?.rows.map(row => row.label)).toContain('链路上下文');
  });

  it('localizes notice-policy evidence context outside zh-CN', () => {
    const context = buildAlertNoticeEvidenceContext(
      'logs',
      {
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        environment: 'prod',
        returnTo: '/log/manage?returnLabel=Logs'
      },
      t
    );

    expect(context).toMatchObject({
      title: 'Notification policy context from logs',
      copy: 'New notification policies match the current entity, service, environment, and trace labels; validation returns to the original troubleshooting context.'
    });
    expect(`${context?.title} ${context?.copy}`).not.toMatch(/[来自日志链路指标三信号排障上下文]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[一-龥]/);
    expect(context?.rows.map(row => row.label)).toContain('Current entity');
  });
});
