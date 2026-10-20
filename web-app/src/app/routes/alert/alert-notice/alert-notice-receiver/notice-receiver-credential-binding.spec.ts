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

import { NoticeReceiver } from '../../../../pojo/NoticeReceiver';
import { NoticeReceiverCredentialBinding, receiverSecretFields } from './notice-receiver-credential-binding';

describe('NoticeReceiverCredentialBinding', () => {
  const cases = [
    { type: 2, destination: 'hookUrl', secret: 'hookAuthToken' },
    { type: 7, destination: 'tgUserId', secret: 'tgBotToken' },
    { type: 7, destination: 'tgMessageThreadId', secret: 'tgBotToken' },
    { type: 9, destination: 'discordChannelId', secret: 'discordBotToken' },
    { type: 15, destination: 'ntfyServerUrl', secret: 'ntfyToken' },
    { type: 15, destination: 'ntfyTopic', secret: 'ntfyToken' }
  ] as const;

  for (const { type, destination, secret } of cases) {
    it(`requires a fresh ${secret} after changing ${destination}, even when changed back`, () => {
      const receiver = Object.assign(new NoticeReceiver(), { type, [destination]: 'old', [secret]: '******last' });
      const binding = new NoticeReceiverCredentialBinding();
      binding.capture(receiver);
      receiver[destination] = 'changed';
      binding.update(receiver);
      expect(receiver[secret]).toBe('');
      expect(binding.missingSecrets(receiver)).toEqual([secret]);
      receiver[secret] = '******last';
      expect(binding.missingSecrets(receiver)).toEqual([secret]);
      receiver[secret] = 'fresh-token';
      expect(binding.missingSecrets(receiver)).toEqual([]);
      receiver[destination] = 'old';
      binding.update(receiver);
      expect(receiver[secret]).toBe('');
      expect(binding.missingSecrets(receiver)).toEqual([secret]);
    });
  }

  it('clears all masked fields on type change without restoring them on return', () => {
    const receiver = Object.assign(new NoticeReceiver(), { type: 15, ntfyTopic: 'old' });
    for (const field of receiverSecretFields) receiver[field] = '******';
    const binding = new NoticeReceiverCredentialBinding();
    binding.capture(receiver);
    receiver.type = 1;
    binding.update(receiver);
    for (const field of receiverSecretFields) expect(receiver[field]).toBe('');
    receiver.type = 15;
    binding.update(receiver);
    expect(binding.missingSecrets(receiver)).toEqual(['ntfyToken']);
  });

  it('keeps an originally unauthenticated ntfy receiver optional', () => {
    const receiver = Object.assign(new NoticeReceiver(), { type: 15, ntfyTopic: 'old' });
    const binding = new NoticeReceiverCredentialBinding();
    binding.capture(receiver);
    receiver.ntfyTopic = 'changed';
    binding.update(receiver);
    expect(binding.missingSecrets(receiver)).toEqual([]);
  });

  it('allows auth-only removal but still requires re-entry for a later URL change', () => {
    const receiver = Object.assign(new NoticeReceiver(), {
      type: 2, hookUrl: 'old', hookAuthType: 'Basic', hookAuthToken: '******'
    });
    const binding = new NoticeReceiverCredentialBinding();
    binding.capture(receiver);
    receiver.hookAuthType = 'None';
    binding.update(receiver);
    expect(receiver.hookAuthToken).toBe('');
    expect(binding.missingSecrets(receiver)).toEqual([]);
    receiver.hookUrl = 'changed';
    binding.update(receiver);
    expect(binding.missingSecrets(receiver)).toEqual(['hookAuthToken']);
  });

  it('resets draft invalidation when another saved configuration is opened', () => {
    const receiver = Object.assign(new NoticeReceiver(), { type: 7, tgUserId: 'old', tgBotToken: '******' });
    const binding = new NoticeReceiverCredentialBinding();
    binding.capture(receiver);
    receiver.tgUserId = 'changed';
    binding.update(receiver);
    const reopened = Object.assign(new NoticeReceiver(), { type: 7, tgUserId: 'old', tgBotToken: '******' });
    binding.capture(reopened);
    expect(binding.missingSecrets(reopened)).toEqual([]);
  });
  it('rejects a pasted mask after an authentication-mode-only change', () => {
    const receiver = Object.assign(new NoticeReceiver(), {
      type: 2, hookUrl: 'old', hookAuthType: 'Basic', hookAuthToken: '******'
    });
    const binding = new NoticeReceiverCredentialBinding();
    binding.capture(receiver);
    receiver.hookAuthType = 'Bearer';
    binding.update(receiver);
    receiver.hookAuthToken = '******';
    expect(binding.missingSecrets(receiver)).toEqual(['hookAuthToken']);
    receiver.hookAuthToken = 'fresh-token';
    expect(binding.missingSecrets(receiver)).toEqual([]);
  });

});
