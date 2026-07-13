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

import {
  buildEmailServerPayload,
  buildSmsServerPayload,
  type EmailServerDraft,
  type SmsServerDraft
} from './message-server-model';

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
