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

import { apiMessageGet, apiMessagePost } from '@/core/http/api-message';

export type EmailServerDraft = {
  type: number;
  emailHost: string;
  emailPort: number;
  emailUsername: string;
  emailPassword: string;
  emailSsl: boolean;
  emailStarttls: boolean;
  enable: boolean;
};

export type SmsProviderType = 'tencent' | 'alibaba' | 'unisms' | 'smslocal' | 'aws' | 'twilio';
export type SmsServerDraft = {
  enable: boolean;
  type: SmsProviderType;
  tencent: { secretId: string; secretKey: string; appId: string; signName: string; templateId: string };
  alibaba: { accessKeyId: string; accessKeySecret: string; signName: string; templateCode: string };
  unisms: { accessKeyId: string; accessKeySecret: string; signature: string; templateId: string; authMode: 'simple' | 'hmac' };
  smslocal: { apiKey: string };
  aws: { accessKeyId: string; accessKeySecret: string; region: string };
  twilio: { accountSid: string; authToken: string; twilioPhoneNumber: string };
};

export function loadEmailServerConfig() {
  return apiMessageGet<EmailServerDraft | null>('/api/config/email');
}

export function loadSmsServerConfig() {
  return apiMessageGet<SmsServerDraft | null>('/api/config/sms');
}

export function saveEmailServerConfig(draft: EmailServerDraft) {
  return apiMessagePost<unknown>('/api/config/email', buildEmailServerPayload(draft));
}

export function saveSmsServerConfig(draft: SmsServerDraft) {
  return apiMessagePost<unknown>('/api/config/sms', buildSmsServerPayload(draft));
}

export function buildEmailServerPayload(draft: EmailServerDraft): EmailServerDraft {
  return { ...draft, emailHost: draft.emailHost.trim(), emailUsername: draft.emailUsername.trim(), emailPassword: draft.emailPassword.trim() };
}

export function buildSmsServerPayload(draft: SmsServerDraft): SmsServerDraft {
  return {
    enable: draft.enable,
    type: draft.type,
    tencent: trimObject(draft.tencent),
    alibaba: trimObject(draft.alibaba),
    unisms: trimObject(draft.unisms),
    smslocal: trimObject(draft.smslocal),
    aws: trimObject(draft.aws),
    twilio: trimObject(draft.twilio)
  };
}

function trimObject<T extends Record<string, string>>(value: T): T {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item.trim()])) as T;
}
