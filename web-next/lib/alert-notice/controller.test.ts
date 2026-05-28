import { describe, expect, it, vi } from 'vitest';
import { buildNoticeListUrl, buildNoticeReceiverPayload, buildNoticeRuleDisplayNames, buildNoticeRuleDraft, buildNoticeRulePayload, buildNoticeTemplateListUrl, buildNoticeTemplatePayload, createNoticeReceiver, createNoticeRule, createNoticeTemplate, deleteNoticeReceiver, deleteNoticeRule, deleteNoticeTemplate, loadAlertNoticeData, loadAlertNoticeDataFromFacade, loadNoticeReceiverDetail, loadNoticeRuleDetail, loadNoticeTemplateDetail, sendNoticeReceiverTest, updateNoticeReceiver, updateNoticeRule, updateNoticeTemplate } from './controller';

describe('alert notice controller', () => {
  it('loads receivers, rules and templates together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ content: [], totalElements: 0 })
      .mockResolvedValueOnce({ content: [], totalElements: 0 })
      .mockResolvedValueOnce({ content: [{ id: 7, name: 'All receiver option', type: 1 }], totalElements: 1, pageIndex: 0, pageSize: 1000 })
      .mockResolvedValueOnce({ content: [{ id: 10, name: 'Custom template page', preset: false }], totalElements: 3, pageIndex: 4, pageSize: 15 })
      .mockResolvedValueOnce({ content: [{ id: 9, name: 'Preset template', preset: true }], totalElements: 1, pageIndex: 0, pageSize: 1000 })
      .mockResolvedValueOnce({ content: [{ id: 10, name: 'Custom template option', preset: false }], totalElements: 1, pageIndex: 0, pageSize: 1000 });

    const result = await loadAlertNoticeData(apiGet as any, {
      receivers: { search: 'Receiver', pageIndex: 2, pageSize: 15 },
      rules: { search: 'Rule', pageIndex: 3, pageSize: 25 },
      templates: { search: 'Template', preset: false, pageIndex: 4, pageSize: 15 }
    });

    expect(apiGet).toHaveBeenNthCalledWith(1, '/notice/receivers?pageIndex=2&pageSize=15&name=Receiver');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/notice/rules?pageIndex=3&pageSize=25&name=Rule');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/notice/receivers?pageIndex=0&pageSize=1000');
    expect(apiGet).toHaveBeenNthCalledWith(4, '/notice/templates?pageIndex=4&pageSize=15&name=Template&preset=false');
    expect(apiGet).toHaveBeenNthCalledWith(5, '/notice/templates?pageIndex=0&pageSize=1000&preset=true');
    expect(apiGet).toHaveBeenNthCalledWith(6, '/notice/templates?pageIndex=0&pageSize=1000&preset=false');
    expect(result).toEqual({
      receivers: { content: [], totalElements: 0 },
      receiverOptions: { content: [{ id: 7, name: 'All receiver option', type: 1 }], totalElements: 1, pageIndex: 0, pageSize: 1000 },
      rules: { content: [], totalElements: 0 },
      templates: {
        content: [{ id: 10, name: 'Custom template page', preset: false }],
        totalElements: 3,
        pageIndex: 4,
        pageSize: 15
      },
      templateOptions: {
        content: [
          { id: 9, name: 'Preset template', preset: true },
          { id: 10, name: 'Custom template option', preset: false }
        ],
        totalElements: 2,
        pageIndex: 0,
        pageSize: 2
      }
    });
  });

  it('loads receivers, rules, templates, and options through facade readers', async () => {
    const readers = {
      receivers: vi.fn().mockResolvedValue({ content: [{ id: 7, name: 'Receiver page' }], totalElements: 1, pageIndex: 2, pageSize: 15 }),
      rules: vi.fn().mockResolvedValue({ content: [{ id: 5, name: 'Rule page' }], totalElements: 1, pageIndex: 3, pageSize: 25 }),
      receiverOptions: vi.fn().mockResolvedValue({ content: [{ id: 9, name: 'Receiver option' }], totalElements: 1, pageIndex: 0, pageSize: 1000 }),
      templates: vi.fn().mockResolvedValue({ content: [{ id: 10, name: 'Custom template', preset: false }], totalElements: 3, pageIndex: 4, pageSize: 15 }),
      templateOptions: vi.fn().mockResolvedValue([
        { id: 8, name: 'Preset template', preset: true },
        { id: 10, name: 'Custom template', preset: false }
      ])
    };

    const result = await loadAlertNoticeDataFromFacade(readers, {
      receivers: { search: 'Receiver', pageIndex: 2, pageSize: 15 },
      rules: { search: 'Rule', pageIndex: 3, pageSize: 25 },
      templates: { search: 'Template', preset: false, pageIndex: 4, pageSize: 15 }
    });

    expect(readers.receivers).toHaveBeenCalledWith({ search: 'Receiver', pageIndex: 2, pageSize: 15 });
    expect(readers.rules).toHaveBeenCalledWith({ search: 'Rule', pageIndex: 3, pageSize: 25 });
    expect(readers.receiverOptions).toHaveBeenCalledWith();
    expect(readers.templates).toHaveBeenCalledWith({ search: 'Template', preset: false, pageIndex: 4, pageSize: 15 });
    expect(readers.templateOptions).toHaveBeenCalledWith();
    expect(result).toEqual({
      receivers: { content: [{ id: 7, name: 'Receiver page' }], totalElements: 1, pageIndex: 2, pageSize: 15 },
      receiverOptions: { content: [{ id: 9, name: 'Receiver option' }], totalElements: 1, pageIndex: 0, pageSize: 1000 },
      rules: { content: [{ id: 5, name: 'Rule page' }], totalElements: 1, pageIndex: 3, pageSize: 25 },
      templates: { content: [{ id: 10, name: 'Custom template', preset: false }], totalElements: 3, pageIndex: 4, pageSize: 15 },
      templateOptions: {
        content: [
          { id: 8, name: 'Preset template', preset: true },
          { id: 10, name: 'Custom template', preset: false }
        ],
        totalElements: 2,
        pageIndex: 0,
        pageSize: 2
      }
    });
  });

  it('builds old Angular-style template list urls with preset, search and page params', () => {
    expect(buildNoticeTemplateListUrl({ search: '  email  ', preset: false, pageIndex: 2, pageSize: 15 })).toBe(
      '/notice/templates?pageIndex=2&pageSize=15&name=email&preset=false'
    );
    expect(buildNoticeTemplateListUrl()).toBe('/notice/templates?pageIndex=0&pageSize=8&preset=true');
  });

  it('keeps receiver and rule data when template loading fails', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ content: [{ id: 7, name: 'Receiver page' }], totalElements: 1 })
      .mockResolvedValueOnce({ content: [{ id: 5, name: 'Rule page' }], totalElements: 1 })
      .mockRejectedValueOnce(new Error('all receiver list failed'))
      .mockRejectedValueOnce(new Error('template list failed'))
      .mockResolvedValueOnce({ content: [{ id: 9, name: 'Preset template', preset: true }], totalElements: 1, pageIndex: 0, pageSize: 1000 })
      .mockRejectedValueOnce(new Error('template options custom list failed'));

    const result = await loadAlertNoticeData(apiGet as any);

    expect(result.receivers).toEqual({ content: [{ id: 7, name: 'Receiver page' }], totalElements: 1 });
    expect(result.receiverOptions).toEqual({ content: [{ id: 7, name: 'Receiver page' }], totalElements: 1 });
    expect(result.rules).toEqual({ content: [{ id: 5, name: 'Rule page' }], totalElements: 1 });
    expect(result.templates).toEqual({ content: [], totalElements: 0, pageIndex: 0, pageSize: 0 });
    expect(result.templateOptions).toEqual({ content: [], totalElements: 0, pageIndex: 0, pageSize: 0 });
  });

  it('builds notice list urls with normalized page params', () => {
    expect(buildNoticeListUrl('/notice/receivers', { search: '  ops  ', pageIndex: -1, pageSize: 0 })).toBe(
      '/notice/receivers?pageIndex=0&pageSize=1&name=ops'
    );
    expect(buildNoticeListUrl('/notice/rules', {})).toBe('/notice/rules?pageIndex=0&pageSize=8');
  });

  it('loads receiver detail and builds receiver payload', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      id: 7,
      name: 'Ops Email',
      hookAuthType: 'Basic',
      hookAuthToken: 'secret',
      slackWebHookUrl: 'https://hooks.slack.example',
      creator: 'system'
    });

    await expect(loadNoticeReceiverDetail(apiGet as any, 7)).resolves.toMatchObject({
      id: 7,
      name: 'Ops Email',
      hookAuthType: 'Basic'
    });
    expect(apiGet).toHaveBeenCalledWith('/notice/receiver/7');

    expect(
      buildNoticeReceiverPayload({
        id: 7,
        name: ' Ops Email ',
        type: '1',
        email: 'ops@example.com',
        phone: '',
        hookUrl: '',
        hookAuthType: 'Basic',
        hookAuthToken: 'secret',
        slackWebHookUrl: 'https://hooks.slack.example',
        agentId: '1000001',
        larkReceiveType: '0',
        creator: 'system'
      } as any)
    ).toMatchObject({
      id: 7,
      name: 'Ops Email',
      type: 1,
      email: 'ops@example.com',
      phone: '',
      hookUrl: '',
      hookAuthType: 'Basic',
      hookAuthToken: 'secret',
      slackWebHookUrl: 'https://hooks.slack.example',
      agentId: 1000001,
      larkReceiveType: 0,
      creator: 'system'
    });
  });

  it('creates, updates, deletes, and test-sends receivers', async () => {
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'Ops Email',
      type: '1',
      email: 'ops@example.com',
      phone: '',
      hookUrl: '',
      hookAuthType: 'None',
      hookAuthToken: '',
      wechatId: '',
      accessToken: '',
      tgBotToken: '',
      tgUserId: '',
      tgMessageThreadId: '',
      larkReceiveType: '0',
      userId: '',
      chatId: '',
      slackWebHookUrl: '',
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
    } as any;

    await createNoticeReceiver(apiPost as any, draft);
    await updateNoticeReceiver(apiPut as any, { ...draft, id: 7 });
    await sendNoticeReceiverTest(apiPost as any, draft);
    await deleteNoticeReceiver(apiDelete as any, 7);

    expect(apiPost).toHaveBeenCalledWith('/notice/receiver', expect.objectContaining({ name: 'Ops Email', hookAuthType: 'None', larkReceiveType: 0 }));
    expect(apiPut).toHaveBeenCalledWith('/notice/receiver', expect.objectContaining({ id: 7, name: 'Ops Email' }));
    expect(apiPost).toHaveBeenCalledWith('/notice/receiver/send-test-msg', expect.objectContaining({ name: 'Ops Email' }));
    expect(apiDelete).toHaveBeenCalledWith('/notice/receiver/7');
  });

  it('loads template detail and manages templates', async () => {
    const apiGet = vi.fn().mockResolvedValue({ id: 9, name: 'Email default', creator: 'system', preset: true });
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'Email default',
      type: '1',
      preset: false,
      content: 'hello',
      creator: 'system'
    };

    await expect(loadNoticeTemplateDetail(apiGet as any, 9)).resolves.toMatchObject({ id: 9, name: 'Email default', creator: 'system' });
    expect(apiGet).toHaveBeenCalledWith('/notice/template/9');

    expect(buildNoticeTemplatePayload({ ...draft, id: 9 })).toEqual({
      id: 9,
      name: 'Email default',
      type: 1,
      preset: false,
      content: 'hello',
      creator: 'system'
    });

    await createNoticeTemplate(apiPost as any, draft);
    await updateNoticeTemplate(apiPut as any, { ...draft, id: 9 });
    await deleteNoticeTemplate(apiDelete as any, 9);

    expect(apiPost).toHaveBeenCalledWith('/notice/template', expect.objectContaining({ name: 'Email default', preset: false, creator: 'system' }));
    expect(apiPut).toHaveBeenCalledWith('/notice/template', expect.objectContaining({ id: 9, name: 'Email default', creator: 'system' }));
    expect(apiDelete).toHaveBeenCalledWith('/notice/template/9');
  });

  it('loads rule detail and manages rules', async () => {
    const apiGet = vi.fn().mockResolvedValue({ id: 5, name: 'PagerDuty critical' });
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiPut = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    const draft = {
      name: 'PagerDuty critical',
      receiverIdsText: '1, 2',
      templateId: '9',
      enable: true,
      filterAll: false,
      labelsText: 'severity:critical',
      daysText: '1,2,3,4,5',
      periodStart: '09:00',
      periodEnd: '18:00'
    };

    await expect(loadNoticeRuleDetail(apiGet as any, 5)).resolves.toEqual({ id: 5, name: 'PagerDuty critical' });
    expect(apiGet).toHaveBeenCalledWith('/notice/rule/5');

    expect(buildNoticeRuleDraft({ id: 5, name: 'PagerDuty critical', receiverId: [1, 2], templateId: 9, enable: true, filterAll: false, labels: { severity: 'critical' }, days: [1, 2], periodStart: new Date(2026, 3, 10, 9, 0, 0), periodEnd: new Date(2026, 3, 10, 18, 0, 0) } as any)).toMatchObject({
      id: 5,
      name: 'PagerDuty critical',
      receiverIdsText: '1, 2',
      templateId: '9',
      labelsText: 'severity:critical'
    });
    expect(buildNoticeRuleDraft(null)).toMatchObject({
      templateId: '-1',
      enable: true,
      filterAll: true,
      daysText: '1, 2, 3, 4, 5, 6, 7',
      periodLimit: false,
      periodStart: '',
      periodEnd: ''
    });
    expect(buildNoticeRuleDraft({ days: [1, 2, 3, 4, 5, 6, 7] } as any)).toMatchObject({
      daysText: '1, 2, 3, 4, 5, 6, 7',
      periodLimit: false
    });
    expect(buildNoticeRuleDraft({ days: [1, 2, 3] } as any)).toMatchObject({
      daysText: '1, 2, 3',
      periodLimit: true
    });

    const displayNames = buildNoticeRuleDisplayNames(
      draft,
      [
        { value: 1, label: 'ops-email-Email' },
        { value: 2, label: 'pager-webhook-WebHook' }
      ],
      [
        { value: '-1', label: 'Default template' },
        { value: 9, label: 'Email default' }
      ]
    );
    expect(displayNames).toEqual({
      receiverName: ['ops-email-Email', 'pager-webhook-WebHook'],
      templateName: 'Email default'
    });
    expect(
      buildNoticeRuleDisplayNames(
        {
          ...draft,
          receiverName: ['detail-email', 'detail-webhook'],
          templateName: 'Detail template'
        },
        [],
        []
      )
    ).toEqual({
      receiverName: ['detail-email', 'detail-webhook'],
      templateName: 'Detail template'
    });

    const payload = buildNoticeRulePayload(draft, displayNames);
    expect(payload).toMatchObject({
      name: 'PagerDuty critical',
      receiverId: [1, 2],
      receiverName: ['ops-email-Email', 'pager-webhook-WebHook'],
      templateId: 9,
      templateName: 'Email default',
      enable: true,
      filterAll: false,
      labels: { severity: 'critical' },
      days: [1, 2, 3, 4, 5]
    });
    expect(payload.periodStart).toMatch(/T09:00:00[+-]\d{2}:\d{2}$/);
    expect(payload.periodEnd).toMatch(/T18:00:00[+-]\d{2}:\d{2}$/);

    expect(buildNoticeRulePayload(buildNoticeRuleDraft(null))).toMatchObject({
      templateId: null,
      enable: true,
      filterAll: true,
      periodStart: null,
      periodEnd: null
    });
    expect(buildNoticeRulePayload({ ...buildNoticeRuleDraft(null), periodLimit: true })).not.toHaveProperty('periodLimit');

    await createNoticeRule(apiPost as any, draft, displayNames);
    await updateNoticeRule(apiPut as any, { ...draft, id: 5 }, displayNames);
    await deleteNoticeRule(apiDelete as any, 5);

    expect(apiPost).toHaveBeenCalledWith('/notice/rule', expect.objectContaining({ name: 'PagerDuty critical', receiverName: ['ops-email-Email', 'pager-webhook-WebHook'], templateName: 'Email default' }));
    expect(apiPut).toHaveBeenCalledWith('/notice/rule', expect.objectContaining({ id: 5, name: 'PagerDuty critical', receiverName: ['ops-email-Email', 'pager-webhook-WebHook'], templateName: 'Email default' }));
    expect(apiDelete).toHaveBeenCalledWith('/notice/rule/5');
  });
});
