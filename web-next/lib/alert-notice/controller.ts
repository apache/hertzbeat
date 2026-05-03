import type { NoticeReceiver, NoticeRule, NoticeTemplate, PageResult } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type NoticeReceiverLike = NoticeReceiver & Record<string, unknown>;
type NoticeTemplateLike = NoticeTemplate & Record<string, unknown>;
type NoticeRuleLike = NoticeRule & Record<string, unknown>;

type NoticeReceiverPayload = Omit<NoticeReceiver, 'id'> & { id?: number; [key: string]: unknown };
type NoticeTemplatePayload = Omit<NoticeTemplate, 'id'> & { id?: number; [key: string]: unknown };
type NoticeRulePayload = Omit<NoticeRule, 'id'> & { id?: number; [key: string]: unknown };

const DEFAULT_PAGE_SIZE = 8;
const TEMPLATE_PAGE_SIZE = 1000;
const RECEIVER_OPTION_PAGE_SIZE = 1000;

export type NoticeReceiverDraft = {
  id?: number;
  name: string;
  type: string;
  email: string;
  phone: string;
  hookUrl: string;
  hookAuthType: string;
  hookAuthToken: string;
  wechatId: string;
  accessToken: string;
  tgBotToken: string;
  tgUserId: string;
  tgMessageThreadId: string;
  larkReceiveType: string;
  userId: string;
  chatId: string;
  slackWebHookUrl: string;
  corpId: string;
  agentId: string;
  appSecret: string;
  partyId: string;
  tagId: string;
  discordChannelId: string;
  discordBotToken: string;
  smnAk: string;
  smnSk: string;
  smnProjectId: string;
  smnRegion: string;
  smnTopicUrn: string;
  serverChanToken: string;
  gotifyToken: string;
  appId: string;
} & Record<string, unknown>;

export type NoticeTemplateDraft = {
  id?: number;
  name: string;
  type: string;
  preset: boolean;
  content: string;
} & Record<string, unknown>;

export type NoticeRuleDraft = {
  id?: number;
  name: string;
  receiverIdsText: string;
  templateId: string;
  enable: boolean;
  filterAll: boolean;
  labelsText: string;
  daysText: string;
  periodStart: string;
  periodEnd: string;
} & Record<string, unknown>;

export type NoticeListQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type NoticeLoadQuery = {
  receivers?: NoticeListQuery;
  rules?: NoticeListQuery;
};

function toTemplatePageResult(templates: NoticeTemplate[] | PageResult<NoticeTemplate>): PageResult<NoticeTemplate> {
  if (Array.isArray(templates)) {
    return {
      content: templates,
      totalElements: templates.length,
      pageIndex: 0,
      pageSize: templates.length
    };
  }

  return templates;
}

function emptyPageResult<T>(): PageResult<T> {
  return {
    content: [],
    totalElements: 0,
    pageIndex: 0,
    pageSize: 0
  };
}

function normalizePageIndex(value?: number) {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.trunc(normalized));
}

function normalizePageSize(value?: number) {
  const normalized = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.trunc(normalized));
}

export function buildNoticeListUrl(path: '/notice/receivers' | '/notice/rules', query: NoticeListQuery = {}) {
  const params = new URLSearchParams({
    pageIndex: String(normalizePageIndex(query.pageIndex)),
    pageSize: String(normalizePageSize(query.pageSize))
  });
  const search = query.search?.trim();
  if (search) {
    params.set('name', search);
  }
  return `${path}?${params.toString()}`;
}

async function loadNoticeReceivers(apiGet: ApiGetter, query?: NoticeListQuery) {
  return apiGet<PageResult<NoticeReceiver>>(buildNoticeListUrl('/notice/receivers', query));
}

async function loadNoticeReceiverOptions(apiGet: ApiGetter) {
  return loadNoticeReceivers(apiGet, { pageIndex: 0, pageSize: RECEIVER_OPTION_PAGE_SIZE });
}

async function loadNoticeRules(apiGet: ApiGetter, query?: NoticeListQuery) {
  return apiGet<PageResult<NoticeRule>>(buildNoticeListUrl('/notice/rules', query));
}

function buildNoticeTemplateListUrl(query: NoticeListQuery & { preset: boolean }) {
  const params = new URLSearchParams({
    pageIndex: String(normalizePageIndex(query.pageIndex)),
    pageSize: String(normalizePageSize(query.pageSize))
  });
  const search = query.search?.trim();
  if (search) {
    params.set('name', search);
  }
  params.set('preset', String(query.preset));
  return `/notice/templates?${params.toString()}`;
}

async function loadNoticeTemplates(apiGet: ApiGetter) {
  const pageSize = TEMPLATE_PAGE_SIZE;
  const [presetTemplates, customTemplates] = await Promise.all([
    apiGet<PageResult<NoticeTemplate>>(buildNoticeTemplateListUrl({ pageSize, preset: true })),
    apiGet<PageResult<NoticeTemplate>>(buildNoticeTemplateListUrl({ pageSize, preset: false }))
  ]);

  return {
    content: [...presetTemplates.content, ...customTemplates.content],
    totalElements: (presetTemplates.totalElements || 0) + (customTemplates.totalElements || 0),
    pageIndex: 0,
    pageSize: presetTemplates.content.length + customTemplates.content.length
  };
}

export async function loadAlertNoticeData(apiGet: ApiGetter, query: NoticeLoadQuery = {}) {
  const [receiversResult, rulesResult, receiverOptionsResult, templatesResult] = await Promise.allSettled([
    loadNoticeReceivers(apiGet, query.receivers),
    loadNoticeRules(apiGet, query.rules),
    loadNoticeReceiverOptions(apiGet),
    loadNoticeTemplates(apiGet)
  ]);
  const receivers = receiversResult.status === 'fulfilled' ? receiversResult.value : emptyPageResult<NoticeReceiver>();

  return {
    receivers,
    receiverOptions: receiverOptionsResult.status === 'fulfilled' ? receiverOptionsResult.value : receivers,
    rules: rulesResult.status === 'fulfilled' ? rulesResult.value : emptyPageResult<NoticeRule>(),
    templates:
      templatesResult.status === 'fulfilled'
        ? toTemplatePageResult(templatesResult.value)
        : emptyPageResult<NoticeTemplate>()
  };
}

export async function loadNoticeReceiverDetail(apiGet: ApiGetter, id: number) {
  return apiGet<NoticeReceiverLike>(`/notice/receiver/${id}`);
}

function parseType(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

function parseOptionalInt(value: unknown) {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toTrimmedText(value: unknown) {
  return String(value ?? '').trim();
}

export function buildNoticeReceiverPayload(draft: NoticeReceiverDraft): NoticeReceiverPayload {
  const {
    id,
    name,
    type,
    email,
    phone,
    hookUrl,
    hookAuthType,
    hookAuthToken,
    wechatId,
    accessToken,
    tgBotToken,
    tgUserId,
    tgMessageThreadId,
    larkReceiveType,
    userId,
    chatId,
    slackWebHookUrl,
    corpId,
    agentId,
    appSecret,
    partyId,
    tagId,
    discordChannelId,
    discordBotToken,
    smnAk,
    smnSk,
    smnProjectId,
    smnRegion,
    smnTopicUrn,
    serverChanToken,
    gotifyToken,
    appId,
    ...rest
  } = draft;
  return {
    ...(id ? { id } : {}),
    ...(rest as Record<string, unknown>),
    name: toTrimmedText(name),
    type: parseType(type),
    email: toTrimmedText(email),
    phone: toTrimmedText(phone),
    hookUrl: toTrimmedText(hookUrl),
    hookAuthType: toTrimmedText(hookAuthType),
    hookAuthToken: toTrimmedText(hookAuthToken),
    wechatId: toTrimmedText(wechatId),
    accessToken: toTrimmedText(accessToken),
    tgBotToken: toTrimmedText(tgBotToken),
    tgUserId: toTrimmedText(tgUserId),
    tgMessageThreadId: toTrimmedText(tgMessageThreadId),
    larkReceiveType: parseOptionalInt(larkReceiveType),
    userId: toTrimmedText(userId),
    chatId: toTrimmedText(chatId),
    slackWebHookUrl: toTrimmedText(slackWebHookUrl),
    corpId: toTrimmedText(corpId),
    agentId: parseOptionalInt(agentId),
    appSecret: toTrimmedText(appSecret),
    partyId: toTrimmedText(partyId),
    tagId: toTrimmedText(tagId),
    discordChannelId: toTrimmedText(discordChannelId),
    discordBotToken: toTrimmedText(discordBotToken),
    smnAk: toTrimmedText(smnAk),
    smnSk: toTrimmedText(smnSk),
    smnProjectId: toTrimmedText(smnProjectId),
    smnRegion: toTrimmedText(smnRegion),
    smnTopicUrn: toTrimmedText(smnTopicUrn),
    serverChanToken: toTrimmedText(serverChanToken),
    gotifyToken: toTrimmedText(gotifyToken),
    appId: toTrimmedText(appId)
  };
}

export async function createNoticeReceiver(apiPost: ApiMutator, draft: NoticeReceiverDraft) {
  return apiPost<void>('/notice/receiver', buildNoticeReceiverPayload(draft));
}

export async function updateNoticeReceiver(apiPut: ApiMutator, draft: NoticeReceiverDraft) {
  return apiPut<void>('/notice/receiver', buildNoticeReceiverPayload(draft));
}

export async function deleteNoticeReceiver(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(`/notice/receiver/${id}`);
}

export async function sendNoticeReceiverTest(apiPost: ApiMutator, draft: NoticeReceiverDraft) {
  return apiPost<void>('/notice/receiver/send-test-msg', buildNoticeReceiverPayload(draft));
}

export async function loadNoticeTemplateDetail(apiGet: ApiGetter, id: number) {
  return apiGet<NoticeTemplateLike>(`/notice/template/${id}`);
}

export function buildNoticeTemplatePayload(draft: NoticeTemplateDraft): NoticeTemplatePayload {
  const { id, name, type, preset, content, ...rest } = draft;
  return {
    ...(id ? { id } : {}),
    ...(rest as Record<string, unknown>),
    name: name.trim(),
    type: parseType(type),
    preset,
    content
  };
}

export async function createNoticeTemplate(apiPost: ApiMutator, draft: NoticeTemplateDraft) {
  return apiPost<void>('/notice/template', { ...buildNoticeTemplatePayload(draft), preset: false });
}

export async function updateNoticeTemplate(apiPut: ApiMutator, draft: NoticeTemplateDraft) {
  return apiPut<void>('/notice/template', buildNoticeTemplatePayload(draft));
}

export async function deleteNoticeTemplate(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(`/notice/template/${id}`);
}

export async function loadNoticeRuleDetail(apiGet: ApiGetter, id: number) {
  return apiGet<NoticeRuleLike>(`/notice/rule/${id}`);
}

function parseIdList(text: string) {
  return text
    .split(',')
    .map(item => Number.parseInt(item.trim(), 10))
    .filter(id => Number.isFinite(id));
}

function parseLabelRecord(text: string) {
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const [key, ...rest] = entry.split(':');
      const normalizedKey = key?.trim();
      if (!normalizedKey) return acc;
      acc[normalizedKey] = rest.join(':').trim() || normalizedKey;
      return acc;
    }, {});
}

function parseDays(text: string) {
  return text
    .split(',')
    .map(item => Number.parseInt(item.trim(), 10))
    .filter(day => Number.isFinite(day) && day >= 1 && day <= 7);
}

function formatTimezoneOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.trunc(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

function toLocalIsoTime(value: string) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(item => Number.parseInt(item, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:00${formatTimezoneOffset(-date.getTimezoneOffset())}`;
}

function toTimeInput(value?: string | number | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildNoticeRulePayload(draft: NoticeRuleDraft): NoticeRulePayload {
  const templateId = Number.parseInt(draft.templateId, 10);
  const { id, name, receiverIdsText, enable, filterAll, labelsText, daysText, periodStart, periodEnd, ...rest } = draft;
  return {
    ...(id ? { id } : {}),
    ...(rest as Record<string, unknown>),
    name: name.trim(),
    receiverId: parseIdList(receiverIdsText),
    templateId: Number.isFinite(templateId) && templateId >= 0 ? templateId : null,
    enable,
    filterAll,
    labels: filterAll ? {} : parseLabelRecord(labelsText),
    days: parseDays(daysText),
    periodStart: toLocalIsoTime(periodStart),
    periodEnd: toLocalIsoTime(periodEnd),
  };
}

export function buildNoticeRuleDraft(rule?: NoticeRule | null, fallback: Partial<NoticeRuleDraft> = {}): NoticeRuleDraft {
  const source = rule as NoticeRuleLike | null | undefined;
  return {
    ...fallback,
    ...(source || {}),
    id: source?.id,
    name: source?.name || fallback.name || '',
    receiverIdsText: (source?.receiverId || []).join(', ') || fallback.receiverIdsText || '',
    templateId: source?.templateId == null ? fallback.templateId || '-1' : String(source.templateId),
    enable: source?.enable ?? fallback.enable ?? true,
    filterAll: source?.filterAll ?? fallback.filterAll ?? true,
    labelsText: Object.entries(source?.labels || {}).map(([key, value]) => `${key}:${value}`).join(', ') || fallback.labelsText || '',
    daysText: (source?.days || []).join(', ') || fallback.daysText || [1, 2, 3, 4, 5, 6, 7].join(', '),
    periodStart: toTimeInput(source?.periodStart) || fallback.periodStart || '09:00',
    periodEnd: toTimeInput(source?.periodEnd) || fallback.periodEnd || '18:00',
  };
}

export async function createNoticeRule(apiPost: ApiMutator, draft: NoticeRuleDraft) {
  return apiPost<void>('/notice/rule', buildNoticeRulePayload(draft));
}

export async function updateNoticeRule(apiPut: ApiMutator, draft: NoticeRuleDraft) {
  return apiPut<void>('/notice/rule', buildNoticeRulePayload(draft));
}

export async function deleteNoticeRule(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(`/notice/rule/${id}`);
}
