import { describe, expect, it, vi } from 'vitest';
import { buildAlertNoticeEvidenceContext, buildNoticeFacts, buildNoticeLaneRows, buildNoticeMetrics, buildNoticeReceiverDraft, buildNoticeReceiverRows, buildNoticeRuleRows, buildNoticeTemplateDraft, buildNoticeTemplateRows, getNoticeReceiverVisibleFieldKeys, validateNoticeReceiverDraft, validateNoticeRuleDraft, validateNoticeTemplateDraft } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();
const zhT = createTranslatorMock({ locale: 'zh-CN' });

function noticeEvidenceTitle(translator: typeof t, signal: 'logs' | 'traces' | 'metrics') {
  return translator('alert.rule.evidence.notice.title', { signal: translator(`alert.rule.signal.${signal}`) });
}

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
      { label: zhT('alert.notice.metrics.visible-receivers'), value: '2' },
      { label: zhT('alert.notice.metrics.visible-rules'), value: '1' },
      { label: zhT('alert.notice.metrics.preset-templates'), value: '1', tone: 'success' }
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
      { title: zhT('alert.notice.lanes.receivers.title'), copy: zhT('alert.notice.lanes.receivers.copy'), meta: zhT('alert.notice.lanes.count-meta', { total: 3, visible: 2 }) },
      { title: zhT('alert.notice.lanes.rules.title'), copy: zhT('alert.notice.lanes.rules.copy'), meta: zhT('alert.notice.lanes.count-meta', { total: 4, visible: 1 }) },
      { title: zhT('alert.notice.lanes.templates.title'), copy: zhT('alert.notice.lanes.templates.copy'), meta: zhT('alert.notice.lanes.count-meta', { total: 5, visible: 1 }) }
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

  it('renders missing alert notice receiver targets with the localized empty fallback', () => {
    expect(
      buildNoticeReceiverRows(
        [
          {
            id: 8,
            name: 'empty receiver',
            type: 7,
            tgBotToken: ' ',
            tgUserId: '',
            gmtUpdate: 1712730000000
          }
        ] as any,
        zhT,
        () => '2026-04-10 18:00:00',
        'zh-CN'
      )
    ).toEqual([
      { key: '8', title: 'empty receiver', copy: zhT('common.none'), meta: `${zhT('alert.notice.type.telegram-bot')} · ${zhT('alert.notice.row.updated')} 2026-04-10 18:00:00` }
    ]);
  });

  it('renders missing alert notice receiver types with the localized empty fallback', () => {
    expect(
      buildNoticeReceiverRows(
        [
          {
            id: 9,
            name: 'receiver without type',
            type: ' ',
            email: 'ops@example.com',
            gmtUpdate: 1712730000000
          }
        ] as any,
        zhT,
        () => '2026-04-10 18:00:00',
        'zh-CN'
      )
    ).toEqual([
      { key: '9', title: 'receiver without type', copy: 'ops@example.com', meta: `${zhT('common.none')} · ${zhT('alert.notice.row.updated')} 2026-04-10 18:00:00` }
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

    expect(buildNoticeReceiverDraft(null).type).toBe('1');
    expect(getNoticeReceiverVisibleFieldKeys(buildNoticeReceiverDraft(null))).toEqual(['email']);
    expect(getNoticeReceiverVisibleFieldKeys({ ...buildNoticeReceiverDraft(null), type: '2', hookAuthType: 'None' })).toEqual(['hookUrl', 'hookAuthType']);
    expect(getNoticeReceiverVisibleFieldKeys({ ...buildNoticeReceiverDraft(null), type: '2', hookAuthType: 'Basic' })).toEqual(['hookUrl', 'hookAuthType', 'hookAuthToken']);
    expect(getNoticeReceiverVisibleFieldKeys({ ...buildNoticeReceiverDraft(null), type: '14', larkReceiveType: '1' })).toEqual(['appId', 'appSecret', 'larkReceiveType', 'chatId']);

    expect(validateNoticeReceiverDraft(buildNoticeReceiverDraft(null), t)).toBe('Receiver name is required');
    expect(validateNoticeReceiverDraft({ ...buildNoticeReceiverDraft(null), name: 'ops-email' }, t)).toBe('Email is required');
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
    expect(buildNoticeTemplateDraft(null).type).toBe('');
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'Email default' }, t)).toBe('Notice type is required');
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'Email default', type: '1' }, t)).toBe('Template content is required');
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'Email default', type: '1', content: 'hello' }, t)).toBeNull();
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

  it('renders missing alert notice template previews with the localized empty fallback', () => {
    expect(buildNoticeTemplateRows([{
      id: 12,
      name: 'Empty template',
      preset: false,
      content: '   ',
      gmtUpdate: 1712730000000
    }] as any, zhT, () => '2026-04-10 18:00:00', 'zh-CN')).toEqual([
      { key: '12', title: 'Empty template', copy: zhT('common.none'), meta: `${zhT('alert.notice.template.preset.false')} · ${zhT('alert.notice.row.updated')} 2026-04-10 18:00:00` }
    ]);
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
        [{ id: 5, name: 'PagerDuty critical', enable: true, receiverName: ['ops-email'], templateId: 9, templateName: 'Default', gmtUpdate: 1712730000000 }] as any,
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
    expect(validateNoticeRuleDraft({ name: 'PagerDuty critical', receiverIdsText: '1', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '', periodStart: '', periodEnd: '' }, t)).toBeNull();
  });

  it('uses the Angular template-id fallback for rule row display', () => {
    const [row] = buildNoticeRuleRows(
      [{ id: 6, name: 'Preset rule', enable: true, receiverName: ['ops-email'], templateId: null, templateName: 'Stale template', gmtUpdate: 1712730000000 }] as any,
      t,
      () => '2026-04-10 18:00:00',
      'en-US'
    );

    expect(row.meta).toBe('Template · Updated 2026-04-10 18:00:00');
    expect(row.meta).not.toContain('Stale template');
  });

  it('localizes alert notice validation and default row labels for chinese workspaces', () => {
    expect(validateNoticeReceiverDraft(buildNoticeReceiverDraft(null), zhT)).toBe(zhT('alert.notice.validation.name'));
    expect(validateNoticeTemplateDraft(buildNoticeTemplateDraft(null), zhT)).toBe(zhT('alert.notice.template.validation.name'));
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'mail-template' }, zhT)).toBe(zhT('alert.notice.template.validation.type'));
    expect(validateNoticeTemplateDraft({ ...buildNoticeTemplateDraft(null), name: 'mail-template', type: '1' }, zhT)).toBe(zhT('alert.notice.template.validation.content'));
    expect(validateNoticeRuleDraft({ name: '', receiverIdsText: '', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '', periodStart: '', periodEnd: '' }, zhT)).toBe(zhT('alert.notice.rule.validation.name'));
    expect(validateNoticeRuleDraft({ name: 'critical notice', receiverIdsText: '', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '', periodStart: '', periodEnd: '' }, zhT)).toBe(zhT('alert.notice.rule.validation.receivers'));
    expect(validateNoticeRuleDraft({ name: 'critical notice', receiverIdsText: '1', templateId: '-1', enable: true, filterAll: false, labelsText: '', daysText: '1,2,3,4,5', periodStart: '09:00', periodEnd: '18:00' }, zhT)).toBe(zhT('alert.notice.rule.validation.labels'));
    expect(validateNoticeRuleDraft({ name: 'critical notice', receiverIdsText: '1', templateId: '-1', enable: true, filterAll: true, labelsText: '', daysText: '', periodStart: '', periodEnd: '' }, zhT)).toBeNull();

    expect(buildNoticeReceiverRows([{ id: 8, name: '', type: 1, email: '', gmtUpdate: 1712730000000 }] as any, zhT, () => '2026-04-10 18:00:00', 'zh-CN')[0].title).toBe(zhT('alert.notice.receivers.default'));
    expect(buildNoticeTemplateRows([{ id: 9, name: '', preset: false, content: '', gmtUpdate: 1712730000000 }] as any, zhT, () => '2026-04-10 18:00:00', 'zh-CN')[0].title).toBe(zhT('alert.notice.templates.default'));
    expect(buildNoticeRuleRows([{ id: 10, name: '', enable: false, receiverName: [], templateName: '', gmtUpdate: 1712730000000 }] as any, zhT, () => '2026-04-10 18:00:00', 'zh-CN')[0].title).toBe(zhT('alert.notice.rules.default'));
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
      title: noticeEvidenceTitle(zhT, 'logs'),
      returnHref: '/log/manage?traceId=trace-123',
      labelsText:
        'hertzbeat.signal:logs, hertzbeat.entity.id:7, service.name:checkout, service.namespace:payments, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:collector-a, hertzbeat.template:spring-boot',
      ruleDraftPatch: {
        filterAll: false,
        labelsText:
          'hertzbeat.signal:logs, hertzbeat.entity.id:7, service.name:checkout, service.namespace:payments, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:collector-a, hertzbeat.template:spring-boot'
      }
    });
    expect(context?.rows.map(row => row.label)).toContain(zhT('signal.context.trace.label'));
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
    expect(`${context?.title} ${context?.copy}`).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => row.label)).toContain('Current entity');
  });
});
