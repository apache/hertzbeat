/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  activeNoticeReceiverDefinition,
  noticeReceiverAgentIdMax,
  noticeReceiverLarkReceiveTypes,
  noticeReceiverNameMaxLength,
  noticeReceiverSecretKeys,
  noticeReceiverWebhookAuthTypes,
  type FeiShuReceiveType,
  type NoticeReceiverOptionKey,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType,
  type WebHookAuthType
} from './notice-receiver-catalog';

export * from './notice-receiver-catalog';

export const noticeReceiverPageSizes = [8, 15, 25] as const;
export type NoticeReceiverQuery = { name: string; pageIndex: number; pageSize: number };

export type NoticeReceiverOptions = Partial<Record<NoticeReceiverOptionKey, string | number>> & {
  hookAuthType?: WebHookAuthType;
  larkReceiveType?: FeiShuReceiveType;
};

export type NoticeReceiverDraft = Record<
  Exclude<NoticeReceiverOptionKey, 'agentId' | 'hookAuthType' | 'larkReceiveType'>,
  string
> & {
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

export function readNoticeReceiverQuery(params: URLSearchParams): NoticeReceiverQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    name: params.get('name')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: noticeReceiverPageSizes.includes(pageSize as (typeof noticeReceiverPageSizes)[number]) ? pageSize : 8
  };
}

export function writeNoticeReceiverQuery(query: NoticeReceiverQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.name) params.set('name', query.name);
  return params;
}

export function createNoticeReceiverDraft(): NoticeReceiverDraft {
  return {
    name: '',
    type: 1,
    phone: '',
    email: '',
    hookUrl: '',
    hookAuthType: 'None',
    hookAuthToken: '',
    wechatId: '',
    accessToken: '',
    tgBotToken: '',
    tgUserId: '',
    tgMessageThreadId: '',
    slackWebHookUrl: '',
    discordChannelId: '',
    discordBotToken: '',
    corpId: '',
    agentId: null,
    appSecret: '',
    userId: '',
    partyId: '',
    tagId: '',
    smnAk: '',
    smnSk: '',
    smnProjectId: '',
    smnRegion: '',
    smnTopicUrn: '',
    serverChanToken: '',
    gotifyToken: '',
    appId: '',
    larkReceiveType: 0,
    chatId: '',
    configuredSecrets: [],
    clearSecrets: []
  };
}

function isEmpty(value: unknown) {
  return value == null || (typeof value === 'string' && !value.trim());
}

function hasSecret(draft: NoticeReceiverDraft, key: NoticeReceiverSecretKey) {
  return !isEmpty(draft[key]) || (draft.configuredSecrets.includes(key) && !draft.clearSecrets.includes(key));
}

function requiredFieldErrors(draft: NoticeReceiverDraft) {
  return activeNoticeReceiverDefinition(draft.type)
    .fields.filter(definition => {
      if (!definition.required) return false;
      return definition.secret
        ? !hasSecret(draft, definition.key as NoticeReceiverSecretKey)
        : isEmpty(draft[definition.key]);
    })
    .map(definition => definition.key);
}

const feiShuRecipientKeys: Partial<Record<FeiShuReceiveType, NoticeReceiverOptionKey>> = {
  0: 'userId',
  1: 'chatId',
  2: 'partyId'
};

export function validateNoticeReceiverDraft(draft: NoticeReceiverDraft) {
  const normalizedName = draft.name.trim();
  const invalid: string[] = normalizedName && normalizedName.length <= noticeReceiverNameMaxLength ? [] : ['name'];
  invalid.push(...requiredFieldErrors(draft));
  invalid.push(...activeValueErrors(draft));
  invalid.push(...channelValidationErrors(draft));
  if (!hasUniqueSecrets(draft.configuredSecrets)) invalid.push('configuredSecrets');
  if (!hasUniqueSecrets(draft.clearSecrets)) invalid.push('clearSecrets');
  const recipientKey = draft.type === 14 ? feiShuRecipientKeys[draft.larkReceiveType] : undefined;
  if (recipientKey && isEmpty(draft[recipientKey])) invalid.push(recipientKey);
  return [...new Set(invalid)];
}

function hasUniqueSecrets(keys: readonly NoticeReceiverSecretKey[]) {
  return new Set(keys).size === keys.length;
}

function activeValueErrors(draft: NoticeReceiverDraft) {
  const invalid: string[] = [];
  if (draft.type === 2 && !noticeReceiverWebhookAuthTypes.includes(draft.hookAuthType)) {
    invalid.push('hookAuthType');
  }
  if (draft.type === 14 && !noticeReceiverLarkReceiveTypes.includes(draft.larkReceiveType)) {
    invalid.push('larkReceiveType');
  }
  if (
    draft.type === 10 &&
    draft.agentId !== null &&
    (!Number.isSafeInteger(draft.agentId) || draft.agentId < 0 || draft.agentId > noticeReceiverAgentIdMax)
  ) {
    invalid.push('agentId');
  }
  return invalid;
}

function channelValidationErrors(draft: NoticeReceiverDraft) {
  if (draft.type === 1 && draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) return ['email'];
  if (draft.type === 2 && draft.hookAuthType !== 'None' && !hasSecret(draft, 'hookAuthToken')) return ['hookAuthToken'];
  if (draft.type === 10 && ![draft.userId, draft.partyId, draft.tagId].some(value => value.trim()))
    return ['recipientTarget'];
  return [];
}

export function buildNoticeReceiverPayload(draft: NoticeReceiverDraft) {
  requireValidNoticeReceiverDraft(draft);
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

function requireValidNoticeReceiverDraft(draft: NoticeReceiverDraft) {
  const invalid = validateNoticeReceiverDraft(draft);
  if (invalid.length > 0) throw new NoticeReceiverInputError(invalid);
}

export class NoticeReceiverInputError extends Error {
  readonly code = 'NOTICE_RECEIVER_INPUT_INVALID';
  readonly fields: readonly string[];

  constructor(fields: readonly string[]) {
    super('Invalid notice receiver input');
    this.name = 'NoticeReceiverInputError';
    this.fields = fields;
  }
}

export function expectedNoticeReceiverEvidence(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  const activeSecrets = noticeReceiverSecretKeys(draft.type);
  const configuredSecrets = activeSecrets.filter(key => {
    if (draft.clearSecrets.includes(key)) return false;
    return draft.configuredSecrets.includes(key) || Boolean(draft[key].trim());
  });
  const options = Object.fromEntries(
    Object.entries(payload.options).filter(
      ([key]) => key !== 'clearSecrets' && !activeSecrets.includes(key as NoticeReceiverSecretKey)
    )
  );
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
  const replacements = noticeReceiverSecretKeys(draft.type).filter(key => {
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
