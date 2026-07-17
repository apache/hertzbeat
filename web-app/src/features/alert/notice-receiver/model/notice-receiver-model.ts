/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const noticeReceiverPageSizes = [8, 15, 25] as const;

export type NoticeReceiverType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type WebHookAuthType = 'None' | 'Basic' | 'Bearer';
export type FeiShuReceiveType = 0 | 1 | 2 | 3;
export type NoticeReceiverQuery = { name: string; pageIndex: number; pageSize: number };

export const noticeReceiverTypeKeys: Record<NoticeReceiverType, string> = {
  0: 'sms', 1: 'email', 2: 'webhook', 3: 'wechat-official', 4: 'wecom-robot',
  5: 'dingtalk-robot', 6: 'feishu-robot', 7: 'telegram-bot', 8: 'slack-webhook',
  9: 'discord-bot', 10: 'wecom-app', 11: 'huawei-smn', 12: 'server-chan',
  13: 'gotify', 14: 'feishu-app'
};

export type NoticeReceiverOptionKey =
  | 'phone' | 'email' | 'hookUrl' | 'hookAuthType' | 'hookAuthToken' | 'wechatId' | 'appId'
  | 'accessToken' | 'tgBotToken' | 'tgUserId' | 'tgMessageThreadId' | 'larkReceiveType'
  | 'userId' | 'chatId' | 'slackWebHookUrl' | 'corpId' | 'agentId' | 'appSecret'
  | 'partyId' | 'tagId' | 'discordChannelId' | 'discordBotToken' | 'smnAk' | 'smnSk'
  | 'smnProjectId' | 'smnRegion' | 'smnTopicUrn' | 'serverChanToken' | 'gotifyToken';

export type NoticeReceiverSecretKey =
  | 'hookUrl' | 'hookAuthToken' | 'wechatId' | 'accessToken' | 'tgBotToken' | 'slackWebHookUrl'
  | 'appSecret' | 'discordBotToken' | 'smnAk' | 'smnSk' | 'serverChanToken' | 'gotifyToken';

export type NoticeReceiverOptions = Partial<Record<NoticeReceiverOptionKey, string | number>> & {
  hookAuthType?: WebHookAuthType;
  larkReceiveType?: FeiShuReceiveType;
};

export type NoticeReceiverDraft = Record<Exclude<NoticeReceiverOptionKey, 'agentId' | 'hookAuthType' | 'larkReceiveType'>, string> & {
  id?: number;
  name: string;
  type: NoticeReceiverType;
  agentId: number | null;
  hookAuthType: WebHookAuthType;
  larkReceiveType: FeiShuReceiveType;
  configuredSecrets: readonly NoticeReceiverSecretKey[];
  clearSecrets: readonly NoticeReceiverSecretKey[];
};

export type NoticeReceiver = {
  id: number;
  name: string;
  type: NoticeReceiverType;
  typeKey: string;
  options: NoticeReceiverOptions;
  configuredSecrets: readonly NoticeReceiverSecretKey[];
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type NoticeReceiverOption = Pick<NoticeReceiver, 'id' | 'name' | 'type'>;
export type NoticeReceiverMutation = {
  id: number;
  status: 'created' | 'updated' | 'deleted' | 'missing';
  receiver: NoticeReceiver | null;
};

type ReceiverFieldKind = 'text' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'webhookAuth' | 'larkReceiveType';
export type ReceiverFieldDefinition = {
  key: NoticeReceiverOptionKey;
  labelKey: string;
  kind: ReceiverFieldKind;
  required?: boolean;
  secret?: boolean;
};
export type ReceiverTypeDefinition = {
  type: NoticeReceiverType;
  labelKey: string;
  fields: ReceiverFieldDefinition[];
};

const secretKeys = new Set<NoticeReceiverSecretKey>([
  'hookUrl', 'hookAuthToken', 'wechatId', 'accessToken', 'tgBotToken', 'slackWebHookUrl',
  'appSecret', 'discordBotToken', 'smnAk', 'smnSk', 'serverChanToken', 'gotifyToken'
]);

const field = (key: NoticeReceiverOptionKey, kind: ReceiverFieldKind = 'text', required = true): ReceiverFieldDefinition => ({
  key, kind, required, secret: secretKeys.has(key as NoticeReceiverSecretKey), labelKey: `noticeReceivers.fields.${key}`
});

export const receiverTypeDefinitions: ReceiverTypeDefinition[] = [
  { type: 0, labelKey: 'noticeReceivers.types.sms', fields: [field('phone', 'tel')] },
  { type: 1, labelKey: 'noticeReceivers.types.email', fields: [field('email', 'email')] },
  { type: 2, labelKey: 'noticeReceivers.types.webhook', fields: [
    field('hookUrl', 'password'), field('hookAuthType', 'webhookAuth', false), field('hookAuthToken', 'password', false)
  ] },
  { type: 3, labelKey: 'noticeReceivers.types.wechat', fields: [] },
  { type: 4, labelKey: 'noticeReceivers.types.wecomRobot', fields: [
    field('wechatId', 'password'), field('phone', 'tel', false), field('userId', 'text', false)
  ] },
  { type: 5, labelKey: 'noticeReceivers.types.dingtalk', fields: [
    field('accessToken', 'password'), field('appSecret', 'password', false), field('phone', 'tel', false),
    field('tgUserId', 'text', false)
  ] },
  { type: 6, labelKey: 'noticeReceivers.types.larkRobot', fields: [
    field('accessToken', 'password'), field('userId', 'text', false)
  ] },
  { type: 7, labelKey: 'noticeReceivers.types.telegram', fields: [
    field('tgBotToken', 'password'), field('tgUserId'), field('tgMessageThreadId', 'text', false)
  ] },
  { type: 8, labelKey: 'noticeReceivers.types.slack', fields: [field('slackWebHookUrl', 'password')] },
  { type: 9, labelKey: 'noticeReceivers.types.discord', fields: [
    field('discordChannelId'), field('discordBotToken', 'password')
  ] },
  { type: 10, labelKey: 'noticeReceivers.types.wecomApp', fields: [
    field('corpId'), field('agentId', 'number'), field('appSecret', 'password'), field('userId', 'text', false),
    field('partyId', 'text', false), field('tagId', 'text', false)
  ] },
  { type: 11, labelKey: 'noticeReceivers.types.smn', fields: [
    field('smnAk', 'password'), field('smnSk', 'password'), field('smnProjectId'), field('smnRegion'), field('smnTopicUrn')
  ] },
  { type: 12, labelKey: 'noticeReceivers.types.serverChan', fields: [field('serverChanToken', 'password')] },
  { type: 13, labelKey: 'noticeReceivers.types.gotify', fields: [field('gotifyToken', 'password')] },
  { type: 14, labelKey: 'noticeReceivers.types.larkApp', fields: [
    field('appId'), field('appSecret', 'password'), field('larkReceiveType', 'larkReceiveType'),
    field('userId', 'text', false), field('chatId', 'text', false), field('partyId', 'text', false)
  ] }
];

export function activeNoticeReceiverDefinition(type: NoticeReceiverType) {
  return receiverTypeDefinitions.find(definition => definition.type === type) ?? receiverTypeDefinitions[1]!;
}

export function noticeReceiverSecretKeys(type: NoticeReceiverType) {
  return activeNoticeReceiverDefinition(type).fields.filter(item => item.secret)
    .map(item => item.key as NoticeReceiverSecretKey);
}

export function readNoticeReceiverQuery(params: URLSearchParams): NoticeReceiverQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    name: params.get('name')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: noticeReceiverPageSizes.includes(pageSize as typeof noticeReceiverPageSizes[number]) ? pageSize : 8
  };
}

export function writeNoticeReceiverQuery(query: NoticeReceiverQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.name) params.set('name', query.name);
  return params;
}

export function buildNoticeReceiverListPath(query: NoticeReceiverQuery) {
  return `/api/notice/receivers?${writeNoticeReceiverQuery(query).toString()}`;
}

export function createNoticeReceiverDraft(): NoticeReceiverDraft {
  return {
    name: '', type: 1, phone: '', email: '', hookUrl: '', hookAuthType: 'None', hookAuthToken: '',
    wechatId: '', accessToken: '', tgBotToken: '', tgUserId: '', tgMessageThreadId: '', slackWebHookUrl: '',
    discordChannelId: '', discordBotToken: '', corpId: '', agentId: null, appSecret: '', userId: '', partyId: '',
    tagId: '', smnAk: '', smnSk: '', smnProjectId: '', smnRegion: '', smnTopicUrn: '', serverChanToken: '',
    gotifyToken: '', appId: '', larkReceiveType: 0, chatId: '', configuredSecrets: [], clearSecrets: []
  };
}

function isEmpty(value: unknown) {
  return value == null || typeof value === 'string' && !value.trim();
}

function hasSecret(draft: NoticeReceiverDraft, key: NoticeReceiverSecretKey) {
  return !isEmpty(draft[key]) || draft.configuredSecrets.includes(key) && !draft.clearSecrets.includes(key);
}

function requiredFieldErrors(draft: NoticeReceiverDraft) {
  return activeNoticeReceiverDefinition(draft.type).fields.filter(definition => {
    if (!definition.required) return false;
    return definition.secret ? !hasSecret(draft, definition.key as NoticeReceiverSecretKey) : isEmpty(draft[definition.key]);
  }).map(definition => definition.key);
}

const feiShuRecipientKeys: Partial<Record<FeiShuReceiveType, NoticeReceiverOptionKey>> = {
  0: 'userId', 1: 'chatId', 2: 'partyId'
};

export function validateNoticeReceiverDraft(draft: NoticeReceiverDraft) {
  const invalid: string[] = draft.name.trim() ? [] : ['name'];
  invalid.push(...requiredFieldErrors(draft));
  invalid.push(...channelValidationErrors(draft));
  const recipientKey = draft.type === 14 ? feiShuRecipientKeys[draft.larkReceiveType] : undefined;
  if (recipientKey && isEmpty(draft[recipientKey])) invalid.push(recipientKey);
  return [...new Set(invalid)];
}

function channelValidationErrors(draft: NoticeReceiverDraft) {
  if (draft.type === 1 && draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) return ['email'];
  if (draft.type === 2 && draft.hookAuthType !== 'None' && !hasSecret(draft, 'hookAuthToken')) return ['hookAuthToken'];
  if (draft.type === 10 && ![draft.userId, draft.partyId, draft.tagId].some(value => value.trim())) return ['recipientTarget'];
  return [];
}

export function buildNoticeReceiverPayload(draft: NoticeReceiverDraft) {
  const options: Record<string, string | number | string[]> = {};
  const active = activeNoticeReceiverDefinition(draft.type);
  for (const definition of active.fields) {
    const value = draft[definition.key];
    if (definition.secret) {
      const key = definition.key as NoticeReceiverSecretKey;
      if (draft.clearSecrets.includes(key)) continue;
      if (typeof value === 'string' && value.trim()) options[key] = value.trim();
      continue;
    }
    if (typeof value === 'string') {
      if (value.trim() || definition.key === 'hookAuthType') options[definition.key] = value.trim();
    } else if (value != null) options[definition.key] = value;
  }
  const clearSecrets = draft.clearSecrets.filter(key => noticeReceiverSecretKeys(draft.type).includes(key));
  if (clearSecrets.length) options.clearSecrets = clearSecrets;
  return { ...(draft.id == null ? {} : { id: draft.id }), name: draft.name.trim(), type: draft.type, options };
}

export function expectedNoticeReceiverEvidence(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  const activeSecrets = noticeReceiverSecretKeys(draft.type);
  const configuredSecrets = activeSecrets.filter(key => {
    if (draft.clearSecrets.includes(key)) return false;
    return draft.configuredSecrets.includes(key) || Boolean(draft[key].trim());
  });
  const options = Object.fromEntries(Object.entries(payload.options)
    .filter(([key]) => key !== 'clearSecrets' && !activeSecrets.includes(key as NoticeReceiverSecretKey)));
  return { options, configuredSecrets };
}

export function noticeReceiverDraftFromDetail(receiver: NoticeReceiver): NoticeReceiverDraft {
  const draft = createNoticeReceiverDraft();
  return {
    ...draft,
    id: receiver.id,
    name: receiver.name,
    type: receiver.type,
    ...receiver.options,
    configuredSecrets: [...receiver.configuredSecrets],
    clearSecrets: []
  } as NoticeReceiverDraft;
}

export function selectNoticeReceiverType(draft: NoticeReceiverDraft, type: NoticeReceiverType): NoticeReceiverDraft {
  const selected = { ...createNoticeReceiverDraft(), name: draft.name, type };
  return draft.id === undefined ? selected : { ...selected, id: draft.id };
}

export function updateNoticeReceiverDraft(draft: NoticeReceiverDraft, patch: Partial<NoticeReceiverDraft>) {
  const replacements = noticeReceiverSecretKeys(draft.type)
    .filter(key => {
      const value = patch[key];
      return typeof value === 'string' && Boolean(value.trim());
    });
  return { ...draft, ...patch, clearSecrets: draft.clearSecrets.filter(key => !replacements.includes(key)) };
}

export function setNoticeReceiverSecretCleared(
  draft: NoticeReceiverDraft,
  key: NoticeReceiverSecretKey,
  cleared: boolean
): NoticeReceiverDraft {
  if (!noticeReceiverSecretKeys(draft.type).includes(key)) return draft;
  return {
    ...draft,
    [key]: cleared ? '' : draft[key],
    clearSecrets: cleared ? [...new Set([...draft.clearSecrets, key])] : draft.clearSecrets.filter(item => item !== key)
  };
}

export function noticeReceiverSettingSummary(receiver: NoticeReceiver):
  { kind: 'address'; value: string } | { kind: 'configured' } {
  if (receiver.type === 0 && receiver.options.phone) return { kind: 'address', value: String(receiver.options.phone) };
  if (receiver.type === 1 && receiver.options.email) return { kind: 'address', value: String(receiver.options.email) };
  return { kind: 'configured' };
}
