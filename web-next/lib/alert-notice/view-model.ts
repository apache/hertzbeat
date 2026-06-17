import type { NoticeReceiver, NoticeRule, NoticeTemplate, PageResult } from '@/lib/types';
import {
  buildAlertRuleEvidenceCopy,
  buildAlertRuleEvidenceTitle
} from '../alert-rule-evidence-copy';
import {
  buildSignalAlertMatchLabels,
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
  receiverTestPreview?: {
    title: string;
    copy: string;
    labelsText: string;
    payloadTitle: string;
    payloadCopy: string;
    payloadRows: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    payloadMessage: string;
  };
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

function normalizeSignal(signal: string | null | undefined) {
  if (signal === 'logs' || signal === 'traces' || signal === 'metrics') {
    return signal;
  }
  return undefined;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map(value => value?.trim()).find((value): value is string => Boolean(value));
}

function parseNoticeLabelPairs(labelsText: string) {
  const labels = new Map<string, string>();
  labelsText.split(',').forEach(item => {
    const [rawKey, ...rawValue] = item.split(':');
    const key = rawKey?.trim();
    const value = rawValue.join(':').trim();
    if (key && value) {
      labels.set(key, value);
    }
  });
  return labels;
}

function buildAlertNoticeReceiverTestPreview(
  signal: 'metrics' | 'logs' | 'traces' | undefined,
  context: SignalRouteContext,
  labelsText: string,
  t: Translator
) {
  const labels = parseNoticeLabelPairs(labelsText);
  const signalLabel = signal ? t(`alert.rule.signal.${signal}`) : t('common.none');
  const ruleName = firstText(context.alertTemplate, context.template, signal ? `${signalLabel} ${t('alert.notice.rules.default')}` : undefined) || t('alert.notice.rules.default');
  const serviceScope = firstText(
    labels.get('service.name'),
    context.serviceName,
    context.entityName,
    context.entityId
  ) || t('common.none');
  const routingScope = firstText(
    labels.get('deployment.environment'),
    labels.get('deployment.environment.name'),
    context.environment,
    labels.get('hertzbeat.entity.id'),
    context.entityId
  ) || t('common.none');
  const queryScope = [labels.get('hertzbeat.alert.datasource'), labels.get('hertzbeat.alert.query_type')]
    .filter(Boolean)
    .join(' / ') || t('common.none');
  const severity = firstText(labels.get('severity'), labels.get('hertzbeat.alert.severity')) || t('alert.notice.receiver.test-preview.payload.severity.sample');

  return {
    title: t('alert.notice.receiver.test-preview.title'),
    copy: t('alert.notice.receiver.test-preview.copy'),
    labelsText,
    payloadTitle: t('alert.notice.receiver.test-preview.payload.title'),
    payloadCopy: t('alert.notice.receiver.test-preview.payload.copy'),
    payloadRows: [
      {
        key: 'status',
        label: t('alert.notice.receiver.test-preview.payload.status'),
        value: t('alert.notice.receiver.test-preview.payload.status.firing')
      },
      {
        key: 'rule',
        label: t('alert.notice.receiver.test-preview.payload.rule'),
        value: ruleName
      },
      {
        key: 'signal',
        label: t('alert.notice.receiver.test-preview.payload.signal'),
        value: signalLabel
      },
      {
        key: 'scope',
        label: t('alert.notice.receiver.test-preview.payload.scope'),
        value: `${serviceScope} · ${routingScope}`
      },
      {
        key: 'query',
        label: t('alert.notice.receiver.test-preview.payload.query'),
        value: queryScope
      },
      {
        key: 'severity',
        label: t('alert.notice.receiver.test-preview.payload.severity'),
        value: severity
      }
    ],
    payloadMessage: t('alert.notice.receiver.test-preview.payload.message', {
      rule: ruleName,
      signal: signalLabel,
      scope: serviceScope
    })
  };
}

export function buildAlertNoticeEvidenceContext(
  signal: string | null | undefined,
  context: SignalRouteContext,
  t: Translator
): AlertNoticeEvidenceContext | null {
  const normalizedSignal = normalizeSignal(signal);
  const labelsText = buildSignalAlertMatchLabels(normalizedSignal, context);
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
    },
    receiverTestPreview: labelsText
      ? buildAlertNoticeReceiverTestPreview(normalizedSignal, context, labelsText, t)
      : undefined
  };
}

export function getAlertNoticeProductCopy(t: Translator) {
  return {
    metricVisibleReceivers: t('alert.notice.metrics.visible-receivers'),
    metricVisibleRules: t('alert.notice.metrics.visible-rules'),
    metricPresetTemplates: t('alert.notice.metrics.preset-templates'),
    receiverLaneCopy: t('alert.notice.lanes.receivers.copy'),
    ruleLaneCopy: t('alert.notice.lanes.rules.copy'),
    templateLaneCopy: t('alert.notice.lanes.templates.copy'),
    countMeta: (total: number, visible: number) => t('alert.notice.lanes.count-meta', { total, visible }),
    updatedLabel: t('alert.notice.row.updated'),
    enabledLabel: t('alert.notice.row.enabled'),
    disabledLabel: t('alert.notice.row.disabled'),
    receiverFallback: t('alert.notice.receivers.default'),
    templateFallback: t('alert.notice.templates.default'),
    ruleFallback: t('alert.notice.rules.default'),
    ruleDeliveryPrefix: t('alert.notice.row.delivery-prefix'),
    ruleNoReceiver: t('alert.notice.row.no-receiver'),
    receiverIdsPlaceholder: t('alert.notice.form.receiver-ids.placeholder'),
    templateIdPlaceholder: t('alert.notice.form.template-id.placeholder'),
    labelsPlaceholder: t('alert.notice.form.labels.placeholder'),
    daysPlaceholder: t('alert.notice.form.days.placeholder'),
    emailPlaceholder: t('alert.notice.form.email.placeholder'),
    phonePlaceholder: t('alert.notice.form.phone.placeholder'),
    hookUrlPlaceholder: t('alert.notice.form.webhook.placeholder')
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

function buildNoticeTemplatePreview(content: string | null | undefined, emptyValue: string) {
  if (!content) {
    return emptyValue;
  }

  const stripped = TEMPLATE_SOURCE_PATTERN.test(content) ? stripNoticeTemplateMarkup(content) : content;
  const decoded = decodeNoticeTemplateEntities(stripped);
  const normalized = normalizeNoticeTemplatePreview(stripNoticeTemplateMarkup(decoded));

  return normalized ? truncateNoticeTemplatePreview(normalized) : emptyValue;
}

function formatNoticeReceiverType(value: NoticeReceiver['type'], t: Translator, emptyValue: string) {
  if (value == null) {
    return emptyValue;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return emptyValue;
  }
  const key = NOTICE_RECEIVER_TYPE_KEYS[normalized] || NOTICE_RECEIVER_TYPE_KEYS[normalized.toUpperCase()];
  return key ? t(key) : normalized;
}

function formatNoticeReceiverTargetValue(value: string | null | undefined, emptyValue: string) {
  return value?.trim() || emptyValue;
}

function formatNoticeReceiverTargetParts(
  values: Array<string | number | null | undefined>,
  emptyValue: string
) {
  const text = values.map(value => String(value ?? '').trim()).filter(Boolean).join(' · ');
  return text || emptyValue;
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

function buildNoticeReceiverTargetCopy(receiver: NoticeReceiver, emptyValue: string) {
  const type = String(receiver.type ?? '');
  switch (type) {
    case '0':
      return formatNoticeReceiverTargetValue(receiver.phone, emptyValue);
    case '1':
      return formatNoticeReceiverTargetValue(receiver.email, emptyValue);
    case '2':
      return formatNoticeReceiverTargetValue(receiver.hookUrl, emptyValue);
    case '3':
    case '4':
      return formatNoticeReceiverTargetValue(receiver.wechatId, emptyValue);
    case '5':
    case '6':
      return formatNoticeReceiverTargetValue(receiver.accessToken, emptyValue);
    case '7':
      return formatNoticeReceiverTargetParts([receiver.tgBotToken, receiver.tgUserId], emptyValue);
    case '8':
      return formatNoticeReceiverTargetValue(receiver.slackWebHookUrl, emptyValue);
    case '9':
      return formatNoticeReceiverTargetParts([receiver.discordChannelId, receiver.discordBotToken], emptyValue);
    case '10':
      return formatNoticeReceiverTargetParts([receiver.corpId, receiver.agentId], emptyValue);
    case '11':
      return formatNoticeReceiverTargetParts([receiver.smnAk, receiver.smnProjectId], emptyValue);
    case '12':
      return formatNoticeReceiverTargetValue(receiver.serverChanToken, emptyValue);
    case '13':
      return formatNoticeReceiverTargetValue(receiver.gotifyToken, emptyValue);
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
      return formatNoticeReceiverTargetParts([receiver.appId, larkCopy], emptyValue);
    }
    default:
      return formatNoticeReceiverTargetParts([receiver.email, receiver.phone, receiver.hookUrl], emptyValue);
  }
}

function buildNoticeRuleDeliveryCopy(receiverNames: string[] | undefined, t: Translator) {
  const copy = getAlertNoticeProductCopy(t);
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
  t: Translator,
  locale?: string | null
) {
  void locale;
  const copy = getAlertNoticeProductCopy(t);
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
  void locale;
  const copy = getAlertNoticeProductCopy(t);
  const emptyValue = t('common.none');
  return items.map(item => ({
    key: String(item.id ?? item.name ?? 'receiver'),
    title: item.name || copy.receiverFallback,
    copy: buildNoticeReceiverTargetCopy(item, emptyValue),
    meta: `${formatNoticeReceiverType(item.type, t, emptyValue)} · ${copy.updatedLabel} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildNoticeReceiverDraft(receiver?: NoticeReceiver | null): NoticeReceiverDraft {
  const source = receiver as (NoticeReceiver & Record<string, unknown>) | null | undefined;
  const receiverType = source ? (source.type == null ? '' : String(source.type)) : '1';
  return {
    ...(source || {}),
    id: source?.id,
    name: source?.name || '',
    type: receiverType,
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
  void locale;
  const copy = getAlertNoticeProductCopy(t);
  const emptyValue = t('common.none');
  return items.map(item => ({
    key: String(item.id ?? item.name ?? 'template'),
    title: item.name || copy.templateFallback,
    copy: buildNoticeTemplatePreview(item.content, emptyValue),
    meta: `${item.preset ? t('alert.notice.template.preset.true') : t('alert.notice.template.preset.false')} · ${copy.updatedLabel} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildNoticeTemplateDraft(template?: NoticeTemplate | null): NoticeTemplateDraft {
  const source = template as (NoticeTemplate & Record<string, unknown>) | null | undefined;
  return {
    ...(source || {}),
    id: source?.id,
    name: source?.name || '',
    type: source?.type == null ? '' : String(source.type),
    preset: source?.preset ?? false,
    content: source?.content || '',
  };
}

export function validateNoticeTemplateDraft(draft: NoticeTemplateDraft, t: Translator) {
  if (!draft.name.trim()) {
    return t('alert.notice.template.validation.name');
  }
  if (!draft.type.trim()) {
    return t('alert.notice.template.validation.type');
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
  void locale;
  const copy = getAlertNoticeProductCopy(t);
  return items.map(item => ({
    key: String(item.id ?? item.name ?? 'rule'),
    title: item.name || copy.ruleFallback,
    copy: `${item.enable ? copy.enabledLabel : copy.disabledLabel} · ${buildNoticeRuleDeliveryCopy(item.receiverName, t)}`,
    meta: `${item.templateId ? item.templateName || copy.templateFallback : copy.templateFallback} · ${copy.updatedLabel} ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildNoticeLaneRows(
  receivers: PageResult<NoticeReceiver>,
  rules: PageResult<NoticeRule>,
  templates: PageResult<NoticeTemplate>,
  t: Translator,
  locale?: string | null
) {
  void locale;
  const copy = getAlertNoticeProductCopy(t);
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
  return null;
}
