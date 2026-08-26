/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  FeiShuReceiveType,
  NoticeReceiverOptionKey,
  NoticeReceiverSecretKey,
  NoticeReceiverType,
  WebHookAuthType
} from './notice-receiver-catalog';

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
