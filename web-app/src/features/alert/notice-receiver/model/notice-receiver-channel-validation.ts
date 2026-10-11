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

import type { NoticeReceiverSecretKey } from './notice-receiver-catalog';
import type { NoticeReceiverDraft } from './notice-receiver-types';

type SecretAvailable = (draft: NoticeReceiverDraft, key: NoticeReceiverSecretKey) => boolean;

export function channelValidationErrors(draft: NoticeReceiverDraft, secretAvailable: SecretAvailable) {
  switch (draft.type) {
    case 1:
      return emailErrors(draft);
    case 4:
    case 5:
      return phoneErrors(draft);
    case 2:
      return webhookAuthErrors(draft, secretAvailable);
    case 10:
      return weComRecipientErrors(draft);
    default:
      return [];
  }
}

function emailErrors(draft: NoticeReceiverDraft) {
  return draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) ? ['email'] : [];
}

function phoneErrors(draft: NoticeReceiverDraft) {
  return draft.phone && !/^(1\d{10})(,\s*1\d{10})*$/.test(draft.phone) ? ['phone'] : [];
}

function webhookAuthErrors(draft: NoticeReceiverDraft, secretAvailable: SecretAvailable) {
  return draft.hookAuthType !== 'None' && !secretAvailable(draft, 'hookAuthToken') ? ['hookAuthToken'] : [];
}

function weComRecipientErrors(draft: NoticeReceiverDraft) {
  return [draft.userId, draft.partyId, draft.tagId].some(value => value.trim()) ? [] : ['recipientTarget'];
}
