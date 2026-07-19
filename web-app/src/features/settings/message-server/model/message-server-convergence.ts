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

import { smsProviderFieldContracts, type EmailServerEvidence, type SmsServerEvidence } from './message-server-contract';
import {
  buildEmailServerPayload,
  buildSmsServerPayload,
  type EmailServerDraft,
  type SmsServerDraft
} from './message-server-model';

export function emailServerSaveConverged(draft: EmailServerDraft, evidence: EmailServerEvidence) {
  if (evidence.status !== 'configured') return false;
  const desired = buildEmailServerPayload(draft);
  const actual = evidence.config;
  const fieldsMatch =
    desired.type === actual.type &&
    desired.emailHost === actual.emailHost &&
    desired.emailUsername === actual.emailUsername &&
    desired.emailPort === actual.emailPort &&
    desired.emailSsl === actual.emailSsl &&
    desired.emailStarttls === actual.emailStarttls &&
    desired.enable === actual.enable;
  return (
    fieldsMatch &&
    secretTransitionConverged(
      Boolean(desired.emailPassword),
      Boolean(desired.clearSecrets?.includes('emailPassword')),
      draft.configuredSecrets.includes('emailPassword'),
      actual.configuredSecrets.includes('emailPassword')
    )
  );
}

export function smsServerSaveConverged(draft: SmsServerDraft, evidence: SmsServerEvidence) {
  if (evidence.status !== 'configured' || evidence.config.type !== draft.type) return false;
  const actual = evidence.config;
  if (actual.enable !== draft.enable) return false;
  const desired = buildSmsServerPayload(draft);
  return smsProviderFieldContracts[draft.type].every(field => {
    if (!field.secret) return actual.options[field.key] === desired.options[field.key];
    return secretTransitionConverged(
      Object.hasOwn(desired.options, field.key),
      Boolean(desired.clearSecrets?.includes(field.key)),
      draft.configuredSecrets.includes(field.key),
      actual.configuredSecrets.includes(field.key)
    );
  });
}

function secretTransitionConverged(replaced: boolean, cleared: boolean, retained: boolean, configured: boolean) {
  if (replaced) return configured;
  if (cleared) return !configured;
  return retained === configured;
}
