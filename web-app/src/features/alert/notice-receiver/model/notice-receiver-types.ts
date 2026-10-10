/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
