/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { NoticeReceiver } from '../../../../pojo/NoticeReceiver';

export const receiverSecretFields = [
  'hookAuthToken',
  'accessToken',
  'tgBotToken',
  'slackWebHookUrl',
  'appSecret',
  'discordBotToken',
  'smnAk',
  'smnSk',
  'serverChanToken',
  'gotifyToken',
  'ntfyToken'
] as const;

type SecretField = (typeof receiverSecretFields)[number];
type CredentialContext = { type: number; destination: string; authType: string; secret?: SecretField };

function context(receiver: NoticeReceiver): CredentialContext {
  const value = (key: keyof NoticeReceiver) => receiver[key] ?? '';
  const result: CredentialContext = { type: receiver.type, destination: '', authType: '' };
  switch (receiver.type) {
    case 2:
      return {
        ...result,
        destination: JSON.stringify([value('hookUrl')]),
        authType: (receiver.hookAuthType || 'None').trim() || 'None',
        secret: 'hookAuthToken'
      };
    case 7:
      return { ...result, destination: JSON.stringify([value('tgUserId'), value('tgMessageThreadId')]), secret: 'tgBotToken' };
    case 9:
      return { ...result, destination: JSON.stringify([value('discordChannelId')]), secret: 'discordBotToken' };
    case 15:
      return { ...result, destination: JSON.stringify([value('ntfyServerUrl'), value('ntfyTopic')]), secret: 'ntfyToken' };
    default:
      return result;
  }
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

// Keep mask recognition aligned with NoticeReceiverMaskUtil.isMaskValue in hertzbeat-alerter.
// If the mask format changes, update both implementations together.
function isFreshSecret(value: string | undefined) {
  return hasValue(value) && !(value?.startsWith('******') && (value.length === 6 || value.length === 10));
}

/** Tracks draft-only invalidation. It never keeps or restores a stored credential value. */
export class NoticeReceiverCredentialBinding {
  private previous?: CredentialContext;
  private original?: CredentialContext;
  private originallyConfigured = false;
  private authContextInvalidated = false;
  private invalidated = new Set<SecretField>();

  capture(receiver: NoticeReceiver) {
    this.previous = context(receiver);
    this.original = this.previous;
    this.originallyConfigured = Boolean(this.original.secret && hasValue(receiver[this.original.secret]));
    this.invalidated.clear();
    this.authContextInvalidated = false;
  }

  update(receiver: NoticeReceiver) {
    const next = context(receiver);
    const previous = this.previous;
    if (!previous) {
      this.capture(receiver);
      return;
    }
    if (next.type !== previous.type) {
      for (const field of receiverSecretFields) {
        if (hasValue(receiver[field])) this.invalidated.add(field);
        receiver[field] = '';
      }
      if (this.originallyConfigured && this.original?.secret) this.invalidated.add(this.original.secret);
    } else if (next.secret) {
      const configured =
        hasValue(receiver[next.secret]) ||
        this.invalidated.has(next.secret) ||
        (this.originallyConfigured && this.original?.type === next.type);
      if (next.destination !== previous.destination && configured) {
        receiver[next.secret] = '';
        this.invalidated.add(next.secret);
      } else if (next.authType !== previous.authType) {
        receiver[next.secret] = '';
        this.authContextInvalidated = true;
      }
    }
    this.previous = next;
  }

  requiresFreshSecret(receiver: NoticeReceiver, field: SecretField) {
    const authRequired =
      field === 'hookAuthToken' && this.authContextInvalidated && (receiver.hookAuthType === 'Basic' || receiver.hookAuthType === 'Bearer');
    return context(receiver).secret === field && (this.invalidated.has(field) || authRequired);
  }

  missingSecrets(receiver: NoticeReceiver): SecretField[] {
    const secret = context(receiver).secret;
    return secret && this.requiresFreshSecret(receiver, secret) && !isFreshSecret(receiver[secret]) ? [secret] : [];
  }
}
