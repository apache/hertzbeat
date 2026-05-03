import type { NoticeReceiver, NoticeRule, NoticeTemplate, PageResult } from '@/lib/types';
import {
  buildAlertRuleEvidenceCopy,
  buildAlertRuleEvidenceTitle
} from '../alert-rule-evidence-copy';
import {
  buildSignalEntityContextRows,
  stripReturnLabelFromHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';
import type { NoticeReceiverDraft, NoticeRuleDraft, NoticeTemplateDraft } from './controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
const TEMPLATE_PREVIEW_MAX_LENGTH = 140;
const TEMPLATE_EXPRESSION_PATTERN = /\$\{([^}]*)\}|{{([\s\S]*?)}}|{%\s*([\s\S]*?)\s*%}/g;
const TEMPLATE_SOURCE_PATTERN = /<!DOCTYPE|<!--|<\/?[a-z][^>]*>|<\/?#|<@|{{|{[%#]|\$\{/i;

export type AlertNoticeEvidenceContext = {
  signal: string;
  title: string;
  copy: string;
  labelsText: string;
  returnHref?: string;
  rows: SignalEntityContextRow[];
  ruleDraftPatch: Partial<NoticeRuleDraft>;
};

const NOTICE_RECEIVER_TYPE_KEYS: Record<string, string> = {
  '0': 'alert.notice.type.sms',
  '1': 'alert.notice.type.email',
  '2': 'alert.notice.type.url',
  '3': 'alert.notice.type.wechat',
  '4': 'alert.notice.type.WeCom-robot',
  '5': 'alert.notice.type.ding',
  '6': 'alert.notice.type.fei-shu',
  '7': 'alert.notice.type.telegram-bot',
  '8': 'alert.notice.type.slack',
  '9': 'alert.notice.type.discord',
  '10': 'alert.notice.type.WeComApp',
  '11': 'alert.notice.type.smn',
  '12': 'alert.notice.type.serverchan',
  '13': 'alert.notice.type.gotify',
  '14': 'alert.notice.type.lark-app',
  SMS: 'alert.notice.type.sms',
  PHONE: 'alert.notice.type.phone',
  EMAIL: 'alert.notice.type.email',
  WEBHOOK: 'alert.notice.type.url',
  URL: 'alert.notice.type.url',
  WECHAT: 'alert.notice.type.wechat',
  WECOM_ROBOT: 'alert.notice.type.WeCom-robot',
  DING: 'alert.notice.type.ding',
  FEISHU: 'alert.notice.type.fei-shu',
  TELEGRAM: 'alert.notice.type.telegram-bot',
  SLACK: 'alert.notice.type.slack',
  DISCORD: 'alert.notice.type.discord',
  WECOMAPP: 'alert.notice.type.WeComApp',
  SMN: 'alert.notice.type.smn',
  SERVERCHAN: 'alert.notice.type.serverchan',
  GOTIFY: 'alert.notice.type.gotify',
  LARK_APP: 'alert.notice.type.lark-app'
};

const NOTICE_RECEIVER_TYPE_FIELD_KEYS: Record<string, Array<keyof NoticeReceiverDraft>> = {
  '0': ['phone'],
  '1': ['email'],
  '2': ['hookUrl', 'hookAuthType'],
  '3': ['wechatId'],
  '4': ['wechatId', 'phone', 'userId'],
  '5': ['accessToken', 'appSecret', 'phone', 'userId'],
  '6': ['accessToken', 'userId'],
  '7': ['tgBotToken', 'tgUserId', 'tgMessageThreadId'],
  '8': ['slackWebHookUrl'],
  '9': ['discordChannelId', 'discordBotToken'],
  '10': ['corpId', 'agentId', 'appSecret', 'userId', 'partyId', 'tagId'],
  '11': ['smnAk', 'smnSk', 'smnProjectId', 'smnRegion', 'smnTopicUrn'],
  '12': ['serverChanToken'],
  '13': ['gotifyToken'],
  '14': ['appId', 'appSecret', 'larkReceiveType']
};

const NOTICE_RECEIVER_LARK_RECEIVE_TYPE_FIELD_KEYS: Record<string, Array<keyof NoticeReceiverDraft>> = {
  '0': ['userId'],
  '1': ['chatId'],
  '2': ['partyId'],
  '3': []
};

const TEMPLATE_EXPRESSION_IGNORE = new Set([
  'if',
  'else',
  'elseif',
  'assign',
  'list',
  'items',
  'item',
  'true',
  'false',
  'null',
  'gt',
  'gte',
  'lt',
  'lte',
  'and',
  'or',
  'not',
  'has_content',
  'if_exists',
  'exists',
  'size',
  'length'
]);

function isChineseLocale(locale?: string | null) {
  return locale?.toLowerCase().startsWith('zh') ?? false;
}

function normalizeSignal(signal: string | null | undefined) {
  if (signal === 'logs' || signal === 'traces' || signal === 'metrics') {
    return signal;
  }
  return undefined;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map(value => value?.trim()).find((value): value is string => Boolean(value));
}

function buildAlertNoticeLabels(signal: string | undefined, context: SignalRouteContext) {
  return [
    ['hertzbeat.signal', signal],
    ['hertzbeat.entity.id', context.entityId],
    ['service.name', context.serviceName],
    ['service.namespace', context.serviceNamespace],
    ['deployment.environment', context.environment],
    ['trace_id', context.traceId],
    ['span_id', context.spanId],
    ['hertzbeat.source', context.source],
    ['hertzbeat.collector', context.collector],
    ['hertzbeat.template', context.template]
  ]
    .map(([key, value]) => {
      const normalizedValue = firstText(value);
      return normalizedValue ? `${key}:${normalizedValue}` : undefined;
    })
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export function buildAlertNoticeEvidenceContext(
  signal: string | null | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertNoticeEvidenceContext | null {
  const normalizedSignal = normalizeSignal(signal);
  const labelsText = buildAlertNoticeLabels(normalizedSignal, context);
  const returnHref = stripReturnLabelFromHref(context.returnTo);
  const rows = buildSignalEntityContextRows(context, {}, t);
  if (!normalizedSignal && !labelsText && !returnHref) {
    return null;
  }

  return {
    signal: normalizedSignal || 'context',
    title: buildAlertRuleEvidenceTitle('notice', normalizedSignal, t),
    copy: buildAlertRuleEvidenceCopy('notice', t),
    labelsText,
    returnHref,
    rows,
    ruleDraftPatch: {
      filterAll: false,
      labelsText
    }
  };
}

export function getAlertNoticeProductCopy(locale?: string | null) {
  if (isChineseLocale(locale)) {
    return {
      metricVisibleReceivers: '当前接收对象',
      metricVisibleRules: '当前通知策略',
      metricPresetTemplates: '预置模板',
      receiverLaneCopy: '管理告警发往哪些接收对象。',
      ruleLaneCopy: '按标签、时间段和模板自动路由通知。',
      templateLaneCopy: '以纯文本摘要预览模板，不暴露原始 HTML 或模板源码。',
      countMeta: (total: number, visible: number) => `共 ${total} 个 · 当前 ${visible} 个`,
      updatedLabel: '更新时间',
      enabledLabel: '已启用',
      disabledLabel: '已停用',
      receiverFallback: '接收对象',
      templateFallback: '通知模板',
      ruleFallback: '通知策略',
      ruleDeliveryPrefix: '发送到',
      ruleNoReceiver: '未绑定接收对象',
      receiverIdsPlaceholder: '接收对象 ID，例如 1, 2',
      templateIdPlaceholder: '模板 ID，-1 表示默认模板',
      labelsPlaceholder: '标签匹配，例如 severity:critical',
      daysPlaceholder: '日期范围，例如 1,2,3,4,5',
      emailPlaceholder: '邮箱地址，例如 ops@example.com',
      phonePlaceholder: '手机号，例如 +86 13800000000',
      hookUrlPlaceholder: 'Webhook 地址，例如 https://hooks.example.com'
    };
  }

  return {
    metricVisibleReceivers: 'Visible receivers',
    metricVisibleRules: 'Visible policies',
    metricPresetTemplates: 'Preset templates',
    receiverLaneCopy: 'Manage who receives each alert notice.',
    ruleLaneCopy: 'Route notices by labels, schedule, and template.',
    templateLaneCopy: 'Preview templates as plain text without exposing raw HTML or source.',
    countMeta: (total: number, visible: number) => `${total} total · ${visible} visible`,
    updatedLabel: 'Updated',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
    receiverFallback: 'Receiver',
    templateFallback: 'Template',
    ruleFallback: 'Notice policy',
    ruleDeliveryPrefix: 'Sending to',
    ruleNoReceiver: 'No receiver linked',
    receiverIdsPlaceholder: 'Receiver IDs, for example 1, 2',
    templateIdPlaceholder: 'Template ID, use -1 for default',
    labelsPlaceholder: 'Label filters, for example severity:critical',
    daysPlaceholder: 'Weekdays, for example 1,2,3,4,5',
    emailPlaceholder: 'Email address, for example ops@example.com',
    phonePlaceholder: 'Phone number, for example +86 13800000000',
    hookUrlPlaceholder: 'Webhook URL, for example https://hooks.example.com'
  };
}

function truncateNoticeTemplatePreview(value: string) {
  if (value.length <= TEMPLATE_PREVIEW_MAX_LENGTH) {
    return value;
  }
  return `${value.slice(0, TEMPLATE_PREVIEW_MAX_LENGTH - 3).trimEnd()}...`;
}

function decodeNoticeTemplateEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function summarizeTemplateExpression(expression: string) {
  const literal = expression.match(/["']([^"']+)["']/)?.[1]?.trim();
  if (literal) {
    return literal;
  }

  const tokens = (expression.match(/[A-Za-z][A-Za-z0-9_-]*/g) || []).filter(
    token => !TEMPLATE_EXPRESSION_IGNORE.has(token.toLowerCase())
  );

  if (tokens.length === 0) {
    return '';
  }

  return tokens[tokens.length - 1].replace(/[_-]+/g, ' ');
}

function stripNoticeTemplateMarkup(value: string) {
  return value
    .replace(/<!DOCTYPE[^>]*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<#[^>]*>/g, ' ')
    .replace(/<\/#[^>]*>/g, ' ')
    .replace(/<@[^>]*>/g, ' ')
    .replace(/<\/@[^>]*>/g, ' ')
    .replace(TEMPLATE_EXPRESSION_PATTERN, (_, freemarker, mustache, liquid) => {
      const summary = summarizeTemplateExpression(String(freemarker || mustache || liquid || ''));
      return summary ? ` ${summary} ` : ' ';
    })
    .replace(/<[^>]+>/g, ' ');
}

function normalizeNoticeTemplatePreview(value: string) {
  return value
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\s)>\s+/g, '$1')
    .replace(/[{}[\]"`]/g, ' ')
    .replace(/\s+[,:;|/\\]\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNoticeTemplatePreview(content?: string | null) {
  if (!content) {
    return '-';
  }

  const stripped = TEMPLATE_SOURCE_PATTERN.test(content) ? stripNoticeTemplateMarkup(content) : content;
  const decoded = decodeNoticeTemplateEntities(stripped);
  const normalized = normalizeNoticeTemplatePreview(stripNoticeTemplateMarkup(decoded));

  return normalized ? truncateNoticeTemplatePreview(normalized) : '-';
}

function formatNoticeReceiverType(value: NoticeReceiver['type'], t: Translator) {
  if (value == null) {
    return '-';
  }

  const normalized = String(value).trim();
  const key = NOTICE_RECEIVER_TYPE_KEYS[normalized] || NOTICE_RECEIVER_TYPE_KEYS[normalized.toUpperCase()];
  return key ? t(key) : normalized;
}

export function getNoticeReceiverVisibleFieldKeys(draft: NoticeReceiverDraft) {
  const type = String(draft.type || '1');
  const fields = NOTICE_RECEIVER_TYPE_FIELD_KEYS[type] || [];
  if (type === '2') {
    return draft.hookAuthType === 'Basic' || draft.hookAuthType === 'Bearer'
      ? [...fields, 'hookAuthToken']
      : fields;
  }
  if (type !== '14') {
    return fields;
  }

  const larkReceiveType = String(draft.larkReceiveType || '0');
  const larkSpecificFields = NOTICE_RECEIVER_LARK_RECEIVE_TYPE_FIELD_KEYS[larkReceiveType] || [];
  return Array.from(new Set([...fields, ...larkSpecificFields]));
}

export function isNoticeReceiverFieldRequired(draft: NoticeReceiverDraft, field: keyof NoticeReceiverDraft) {
  const type = String(draft.type || '1');
  switch (type) {
    case '0':
      return field === 'phone';
    case '1':
      return field === 'email';
    case '2':
      return field === 'hookUrl' || field === 'hookAuthType' || (field === 'hookAuthToken' && ['Basic', 'Bearer'].includes(draft.hookAuthType.trim()));
    case '3':
      return field === 'wechatId';
    case '4':
      return field === 'wechatId';
    case '5':
      return field === 'accessToken';
    case '6':
      return field === 'accessToken';
    case '7':
      return field === 'tgBotToken' || field === 'tgUserId';
    case '8':
      return field === 'slackWebHookUrl';
    case '9':
      return field === 'discordChannelId' || field === 'discordBotToken';
    case '10':
      return field === 'corpId' || field === 'agentId' || field === 'appSecret';
    case '11':
      return field === 'smnAk' || field === 'smnSk' || field === 'smnProjectId' || field === 'smnRegion' || field === 'smnTopicUrn';
    case '12':
      return field === 'serverChanToken';
    case '13':
      return field === 'gotifyToken';
    case '14': {
      if (field === 'appId' || field === 'appSecret' || field === 'larkReceiveType') return true;
      const larkReceiveType = String(draft.larkReceiveType || '0');
      if (larkReceiveType === '0') return field === 'userId';
      if (larkReceiveType === '1') return field === 'chatId';
      if (larkReceiveType === '2') return field === 'partyId';
      return false;
    }
    default:
      return false;
  }
}

function getNoticeReceiverTypeRequiredFieldKeys(draft: NoticeReceiverDraft) {
  return getNoticeReceiverVisibleFieldKeys(draft).filter(field => isNoticeReceiverFieldRequired(draft, field));
}

function buildNoticeReceiverTargetCopy(receiver: NoticeReceiver) {
  const type = String(receiver.type ?? '');
  switch (type) {
    case '0':
      return receiver.phone?.trim() || '-';
    case '1':
      return receiver.email?.trim() || '-';
    case '2':
      return receiver.hookUrl?.trim() || '-';
    case '3':
    case '4':
      return receiver.wechatId?.trim() || '-';
    case '5':
    case '6':
      return receiver.accessToken?.trim() || '-';
    case '7':
      return [receiver.tgBotToken?.trim(), receiver.tgUserId?.trim()].filter(Boolean).join(' · ') || '-';
    case '8':
      return receiver.slackWebHookUrl?.trim() || '-';
    case '9':
      return [receiver.discordChannelId?.trim(), receiver.discordBotToken?.trim()].filter(Boolean).join(' · ') || '-';
    case '10':
      return [receiver.corpId?.trim(), receiver.agentId != null ? String(receiver.agentId).trim() : ''].filter(Boolean).join(' · ') || '-';
    case '11':
      return [receiver.smnAk?.trim(), receiver.smnProjectId?.trim()].filter(Boolean).join(' · ') || '-';
    case '12':
      return receiver.serverChanToken?.trim() || '-';
    case '13':
      return receiver.gotifyToken?.trim() || '-';
    case '14': {
      const larkReceiveType = String(receiver.larkReceiveType ?? '');
      const larkCopy =
        larkReceiveType === '0'
          ? receiver.userId?.trim()
          : larkReceiveType === '1'
            ? receiver.chatId?.trim()
            : larkReceiveType === '2'
              ? receiver.partyId?.trim()
              : receiver.appId?.trim();
      return [receiver.appId?.trim(), larkCopy].filter(Boolean).join(' · ') || '-';
    }
    default:
      return receiver.email?.trim() || receiver.phone?.trim() || receiver.hookUrl?.trim() || '-';
  }
}

function buildNoticeRuleDeliveryCopy(receiverNames: string[] | undefined, locale?: string | null) {
  const copy = getAlertNoticeProductCopy(locale);
  const targets = receiverNames?.join(', ') || '';
  return targets ? `${copy.ruleDeliveryPrefix} ${targets}` : copy.ruleNoReceiver;
}

export function buildNoticeFacts(receivers: PageResult<NoticeReceiver>, rules: PageResult<NoticeRule>, templates: PageResult<NoticeTemplate>, t: Translator) {
  return [
    { label: t('common.workspace'), value: 'alert/notice' },
    { label: t('alert.notice.receivers.title'), value: String(receivers.totalElements || 0) },
    { label: t('alert.notice.rules.title'), value: String(rules.totalElements || 0) },
    { label: t('alert.notice.templates.title'), value: String(templates.totalElements || 0) }
  ];
}

export function buildNoticeMetrics(
  receivers: PageResult<NoticeReceiver>,
  rules: PageResult<NoticeRule>,
  templates: PageResult<NoticeTemplate>,
  _t: Translator,
  locale?: string | null
) {
  const copy = getAlertNoticeProductCopy(locale);
  return [
    { label: copy.metricVisibleReceivers, value: String(receivers.content.length || 0) },
    { label: copy.metricVisibleRules, value: String(rules.content.length || 0) },
    { label: copy.metricPresetTemplates, value: String(templates.content.filter(item => item.preset).length || 0), tone: templates.content.some(item => item.preset) ? 'success' : undefined }
  ];
}

export function buildNoticeReceiverRows(
  items: NoticeReceiver[],
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  locale?: string | null
) {
  const copy = getAlertNoticeProductCopy(locale);
  return items.map(item => ({
    key: String(item.id ?? item.name ?? 'receiver'),
    title: item.name || copy.receiverFallback,
    copy: buildNoticeReceiverTargetCopy(item),
    meta: `${formatNoticeReceiverType(item.type, t)} · ${copy.updatedLabel} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildNoticeReceiverDraft(receiver?: NoticeReceiver | null): NoticeReceiverDraft {
  const source = receiver as (NoticeReceiver & Record<string, unknown>) | null | undefined;
  return {
    ...(source || {}),
    id: source?.id,
    name: source?.name || '',
    type: String(source?.type ?? 1),
    email: source?.email || '',
    phone: source?.phone || '',
    hookUrl: source?.hookUrl || '',
    hookAuthType: source?.hookAuthType || 'None',
    hookAuthToken: source?.hookAuthToken || '',
    wechatId: source?.wechatId || '',
    accessToken: source?.accessToken || '',
    tgBotToken: source?.tgBotToken || '',
    tgUserId: source?.tgUserId || '',
    tgMessageThreadId: source?.tgMessageThreadId || '',
    larkReceiveType: String(source?.larkReceiveType ?? 0),
    userId: source?.userId || '',
    chatId: source?.chatId || '',
    slackWebHookUrl: source?.slackWebHookUrl || '',
    corpId: source?.corpId || '',
    agentId: source?.agentId != null ? String(source.agentId) : '',
    appSecret: source?.appSecret || '',
    partyId: source?.partyId || '',
    tagId: source?.tagId || '',
    discordChannelId: source?.discordChannelId || '',
    discordBotToken: source?.discordBotToken || '',
    smnAk: source?.smnAk || '',
    smnSk: source?.smnSk || '',
    smnProjectId: source?.smnProjectId || '',
    smnRegion: source?.smnRegion || '',
    smnTopicUrn: source?.smnTopicUrn || '',
    serverChanToken: source?.serverChanToken || '',
    gotifyToken: source?.gotifyToken || '',
    appId: source?.appId || '',
  };
}

export function validateNoticeReceiverDraft(draft: NoticeReceiverDraft, t: Translator) {
  if (!draft.name.trim()) {
    return t('alert.notice.validation.name');
  }
  const requiredFields = getNoticeReceiverTypeRequiredFieldKeys(draft);
  for (const field of requiredFields) {
    if (!String(draft[field] ?? '').trim()) {
      switch (field) {
        case 'email':
          return t('alert.notice.validation.email');
        case 'phone':
          return t('alert.notice.validation.phone');
        case 'hookUrl':
          return t('alert.notice.validation.hookUrl');
        case 'hookAuthToken':
          return t('alert.notice.validation.hookAuthToken');
        case 'wechatId':
          return t('alert.notice.validation.wechatId');
        case 'accessToken':
          return t('alert.notice.validation.accessToken');
        case 'tgBotToken':
          return t('alert.notice.validation.tgBotToken');
        case 'tgUserId':
          return t('alert.notice.validation.tgUserId');
        case 'slackWebHookUrl':
          return t('alert.notice.validation.slackWebHookUrl');
        case 'discordChannelId':
          return t('alert.notice.validation.discordChannelId');
        case 'discordBotToken':
          return t('alert.notice.validation.discordBotToken');
        case 'corpId':
          return t('alert.notice.validation.corpId');
        case 'agentId':
          return t('alert.notice.validation.agentId');
        case 'appSecret':
          return t('alert.notice.validation.appSecret');
        case 'smnAk':
          return t('alert.notice.validation.smnAk');
        case 'smnSk':
          return t('alert.notice.validation.smnSk');
        case 'smnProjectId':
          return t('alert.notice.validation.smnProjectId');
        case 'smnRegion':
          return t('alert.notice.validation.smnRegion');
        case 'smnTopicUrn':
          return t('alert.notice.validation.smnTopicUrn');
        case 'serverChanToken':
          return t('alert.notice.validation.serverChanToken');
        case 'gotifyToken':
          return t('alert.notice.validation.gotifyToken');
        case 'appId':
          return t('alert.notice.validation.appId');
        case 'larkReceiveType':
          return t('alert.notice.validation.larkReceiveType');
        case 'userId':
          return t('alert.notice.validation.userId');
        case 'chatId':
          return t('alert.notice.validation.chatId');
        case 'partyId':
          return t('alert.notice.validation.partyId');
        default:
          break;
      }
    }
  }
  if (draft.type === '2' && ['Basic', 'Bearer'].includes(draft.hookAuthType) && !draft.hookAuthToken.trim()) {
    return t('alert.notice.validation.hookAuthToken');
  }
  return null;
}

export function buildNoticeTemplateRows(
  items: NoticeTemplate[],
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  locale?: string | null
) {
  const copy = getAlertNoticeProductCopy(locale);
  return items.map(item => ({
    key: String(item.id ?? item.name ?? 'template'),
    title: item.name || copy.templateFallback,
    copy: buildNoticeTemplatePreview(item.content),
    meta: `${item.preset ? t('alert.notice.template.preset.true') : t('alert.notice.template.preset.false')} · ${copy.updatedLabel} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildNoticeTemplateDraft(template?: NoticeTemplate | null): NoticeTemplateDraft {
  const source = template as (NoticeTemplate & Record<string, unknown>) | null | undefined;
  return {
    ...(source || {}),
    id: source?.id,
    name: source?.name || '',
    type: String(source?.type ?? 1),
    preset: source?.preset ?? false,
    content: source?.content || '',
  };
}

export function validateNoticeTemplateDraft(draft: NoticeTemplateDraft, t: Translator) {
  if (!draft.name.trim()) {
    return t('alert.notice.template.validation.name');
  }
  if (!draft.content.trim()) {
    return t('alert.notice.template.validation.content');
  }
  return null;
}

export function buildNoticeRuleRows(
  items: NoticeRule[],
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  locale?: string | null
) {
  const copy = getAlertNoticeProductCopy(locale);
  return items.map(item => ({
    key: String(item.id ?? item.name ?? 'rule'),
    title: item.name || copy.ruleFallback,
    copy: `${item.enable ? copy.enabledLabel : copy.disabledLabel} · ${buildNoticeRuleDeliveryCopy(item.receiverName, locale)}`,
    meta: `${item.templateName || copy.templateFallback} · ${copy.updatedLabel} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildNoticeLaneRows(
  receivers: PageResult<NoticeReceiver>,
  rules: PageResult<NoticeRule>,
  templates: PageResult<NoticeTemplate>,
  t: Translator,
  locale?: string | null
) {
  const copy = getAlertNoticeProductCopy(locale);
  return [
    {
      title: t('alert.notice.lanes.receivers.title'),
      copy: copy.receiverLaneCopy,
      meta: copy.countMeta(receivers.totalElements || 0, receivers.content.length || 0)
    },
    {
      title: t('alert.notice.lanes.rules.title'),
      copy: copy.ruleLaneCopy,
      meta: copy.countMeta(rules.totalElements || 0, rules.content.length || 0)
    },
    {
      title: t('alert.notice.lanes.templates.title'),
      copy: copy.templateLaneCopy,
      meta: copy.countMeta(templates.totalElements || 0, templates.content.length || 0)
    }
  ];
}

export function validateNoticeRuleDraft(draft: NoticeRuleDraft, t: Translator) {
  if (!draft.name.trim()) return t('alert.notice.rule.validation.name');
  if (!draft.receiverIdsText.trim()) return t('alert.notice.rule.validation.receivers');
  if (!draft.filterAll && !draft.labelsText.trim()) return t('alert.notice.rule.validation.labels');
  if (!draft.daysText.trim()) return t('alert.notice.rule.validation.days');
  if (!draft.periodStart || !draft.periodEnd) return t('alert.notice.rule.validation.period');
  return null;
}
