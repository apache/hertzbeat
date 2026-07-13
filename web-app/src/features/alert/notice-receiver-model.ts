/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const noticeReceiverPageSizes = [8, 15, 25] as const;

export type NoticeReceiverType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type WebHookAuthType = 'None' | 'Basic' | 'Bearer';
export type NoticeReceiverQuery = { name: string; pageIndex: number; pageSize: number };

export type NoticeReceiverDraft = {
  id?: number;
  name: string;
  type: NoticeReceiverType;
  phone: string;
  email: string;
  hookUrl: string;
  hookAuthType: WebHookAuthType;
  hookAuthToken: string;
  wechatId: string;
  accessToken: string;
  tgBotToken: string;
  tgUserId: string;
  tgMessageThreadId: string;
  slackWebHookUrl: string;
  discordChannelId: string;
  discordBotToken: string;
  corpId: string;
  agentId: number | null;
  appSecret: string;
  userId: string;
  partyId: string;
  tagId: string;
  smnAk: string;
  smnSk: string;
  smnProjectId: string;
  smnRegion: string;
  smnTopicUrn: string;
  serverChanToken: string;
  gotifyToken: string;
  appId: string;
  larkReceiveType: number;
  chatId: string;
  ntfyServerUrl: string;
  ntfyTopic: string;
  ntfyToken: string;
};

export type NoticeReceiver = Partial<NoticeReceiverDraft> & {
  id: number;
  type: NoticeReceiverType;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
};

type ReceiverFieldKey = Exclude<keyof NoticeReceiverDraft, 'id' | 'name' | 'type'>;
type ReceiverFieldKind = 'text' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'webhookAuth' | 'larkReceiveType';
export type ReceiverFieldDefinition = { key: ReceiverFieldKey; labelKey: string; kind: ReceiverFieldKind; required?: boolean };
export type ReceiverTypeDefinition = { type: NoticeReceiverType; labelKey: string; fields: ReceiverFieldDefinition[] };

const field = (key: ReceiverFieldKey, kind: ReceiverFieldKind = 'text', required = true): ReceiverFieldDefinition => ({
  key,
  kind,
  required,
  labelKey: `noticeReceivers.fields.${key}`
});

export const receiverTypeDefinitions: ReceiverTypeDefinition[] = [
  { type: 0, labelKey: 'noticeReceivers.types.sms', fields: [field('phone', 'tel')] },
  { type: 1, labelKey: 'noticeReceivers.types.email', fields: [field('email', 'email')] },
  { type: 2, labelKey: 'noticeReceivers.types.webhook', fields: [field('hookUrl', 'url'), field('hookAuthType', 'webhookAuth', false), field('hookAuthToken', 'password', false)] },
  { type: 3, labelKey: 'noticeReceivers.types.wechat', fields: [field('wechatId')] },
  { type: 4, labelKey: 'noticeReceivers.types.wecomRobot', fields: [field('wechatId', 'password')] },
  { type: 5, labelKey: 'noticeReceivers.types.dingtalk', fields: [field('accessToken', 'password')] },
  { type: 6, labelKey: 'noticeReceivers.types.larkRobot', fields: [field('accessToken', 'password')] },
  { type: 7, labelKey: 'noticeReceivers.types.telegram', fields: [field('tgBotToken', 'password'), field('tgUserId'), field('tgMessageThreadId', 'text', false)] },
  { type: 8, labelKey: 'noticeReceivers.types.slack', fields: [field('slackWebHookUrl', 'password')] },
  { type: 9, labelKey: 'noticeReceivers.types.discord', fields: [field('discordChannelId'), field('discordBotToken', 'password')] },
  { type: 10, labelKey: 'noticeReceivers.types.wecomApp', fields: [field('corpId'), field('agentId', 'number'), field('appSecret', 'password'), field('userId', 'text', false), field('partyId', 'text', false), field('tagId', 'text', false)] },
  { type: 11, labelKey: 'noticeReceivers.types.smn', fields: [field('smnAk'), field('smnSk', 'password'), field('smnProjectId'), field('smnRegion'), field('smnTopicUrn')] },
  { type: 12, labelKey: 'noticeReceivers.types.serverChan', fields: [field('serverChanToken', 'password')] },
  { type: 13, labelKey: 'noticeReceivers.types.gotify', fields: [field('gotifyToken', 'password')] },
  { type: 14, labelKey: 'noticeReceivers.types.larkApp', fields: [field('appId'), field('appSecret', 'password'), field('larkReceiveType', 'larkReceiveType'), field('userId', 'text', false), field('chatId', 'text', false), field('partyId', 'text', false)] },
  { type: 15, labelKey: 'noticeReceivers.types.ntfy', fields: [field('ntfyServerUrl', 'url', false), field('ntfyTopic'), field('ntfyToken', 'password', false)] }
];

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
  const params = writeNoticeReceiverQuery(query);
  return `/api/notice/receivers?${params.toString()}`;
}

export function createNoticeReceiverDraft(): NoticeReceiverDraft {
  return {
    name: '', type: 1, phone: '', email: '', hookUrl: '', hookAuthType: 'None', hookAuthToken: '',
    wechatId: '', accessToken: '', tgBotToken: '', tgUserId: '', tgMessageThreadId: '', slackWebHookUrl: '',
    discordChannelId: '', discordBotToken: '', corpId: '', agentId: null, appSecret: '', userId: '', partyId: '',
    tagId: '', smnAk: '', smnSk: '', smnProjectId: '', smnRegion: '', smnTopicUrn: '', serverChanToken: '',
    gotifyToken: '', appId: '', larkReceiveType: 0, chatId: '', ntfyServerUrl: 'https://ntfy.sh', ntfyTopic: '', ntfyToken: ''
  };
}

function activeDefinition(type: NoticeReceiverType) {
  return receiverTypeDefinitions.find(definition => definition.type === type) ?? receiverTypeDefinitions[1]!;
}

function isEmpty(value: NoticeReceiverDraft[ReceiverFieldKey]) {
  return value == null || (typeof value === 'string' && !value.trim());
}

function requiredFieldErrors(draft: NoticeReceiverDraft) {
  const invalid: string[] = [];
  for (const definition of activeDefinition(draft.type).fields) {
    if (definition.required && isEmpty(draft[definition.key])) invalid.push(definition.key);
  }
  return invalid;
}

const larkRecipientKeys: Partial<Record<number, ReceiverFieldKey>> = { 0: 'userId', 1: 'chatId', 2: 'partyId' };

function channelSpecificErrors(draft: NoticeReceiverDraft) {
  const invalid: string[] = [];
  if (draft.type === 1 && draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) invalid.push('email');
  if (draft.type === 2 && draft.hookAuthType !== 'None' && !draft.hookAuthToken.trim()) invalid.push('hookAuthToken');
  const recipientKey = draft.type === 14 ? larkRecipientKeys[draft.larkReceiveType] : undefined;
  if (recipientKey && isEmpty(draft[recipientKey])) invalid.push(recipientKey);
  return [...new Set(invalid)];
}

export function validateNoticeReceiverDraft(draft: NoticeReceiverDraft) {
  const nameErrors = draft.name.trim() ? [] : ['name'];
  return [...new Set([...nameErrors, ...requiredFieldErrors(draft), ...channelSpecificErrors(draft)])];
}

export function buildNoticeReceiverPayload(draft: NoticeReceiverDraft) {
  const payload: Record<string, string | number | null> = { ...(draft.id ? { id: draft.id } : {}), name: draft.name.trim(), type: draft.type };
  for (const definition of activeDefinition(draft.type).fields) {
    if (definition.key === 'hookAuthToken' && draft.hookAuthType === 'None') continue;
    const value = draft[definition.key];
    payload[definition.key] = typeof value === 'string' ? value.trim() : value;
  }
  return payload;
}

export function noticeReceiverDraftFromDetail(receiver: NoticeReceiver): NoticeReceiverDraft {
  return { ...createNoticeReceiverDraft(), ...receiver };
}

export function noticeReceiverSettingSummary(receiver: NoticeReceiver): { kind: 'address'; value: string } | { kind: 'endpoint'; value: string } | { kind: 'configured' } {
  if (receiver.type === 0 && receiver.phone) return { kind: 'address', value: receiver.phone };
  if (receiver.type === 1 && receiver.email) return { kind: 'address', value: receiver.email };
  if (receiver.type === 2 && receiver.hookUrl) {
    try {
      return { kind: 'endpoint', value: `${new URL(receiver.hookUrl).origin}/…` };
    } catch {
      return { kind: 'configured' };
    }
  }
  return { kind: 'configured' };
}
