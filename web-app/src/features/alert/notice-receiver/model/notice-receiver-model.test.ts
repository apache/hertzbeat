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

import { describe, expect, it } from 'vitest';

import {
  buildNoticeReceiverListPath,
  buildNoticeReceiverPayload,
  createNoticeReceiverDraft,
  expectedNoticeReceiverEvidence,
  noticeReceiverDraftFromDetail,
  selectNoticeReceiverType,
  setNoticeReceiverSecretCleared,
  validateNoticeReceiverDraft
} from './notice-receiver-model';
import { noticeReceiverSettingSummary } from './notice-receiver-summary';

describe('notice receiver model', () => {
  it('builds the master receiver pagination contract', () => {
    expect(buildNoticeReceiverListPath({ name: '', pageIndex: 0, pageSize: 8 })).toBe(
      '/api/notice/receivers?pageIndex=0&pageSize=8'
    );
    expect(buildNoticeReceiverListPath({ name: 'on-call', pageIndex: 1, pageSize: 15 })).toBe(
      '/api/notice/receivers?pageIndex=1&pageSize=15&name=on-call'
    );
  });

  it('builds only the selected WebHook fields and validates its auth mode', () => {
    const draft = {
      ...createNoticeReceiverDraft(),
      name: 'Incident gateway',
      type: 2 as const,
      hookUrl: 'https://hooks.example.test/alert',
      hookAuthType: 'Bearer' as const,
      hookAuthToken: 'secret-token',
      email: 'stale@example.test'
    };
    expect(validateNoticeReceiverDraft(draft)).toEqual([]);
    expect(buildNoticeReceiverPayload(draft)).toEqual({
      name: 'Incident gateway',
      type: 2,
      options: {
        hookUrl: 'https://hooks.example.test/alert',
        hookAuthType: 'Bearer',
        hookAuthToken: 'secret-token'
      }
    });
  });

  it('retains, replaces, and explicitly clears only active-type secrets', () => {
    const evidence = {
      id: 7,
      name: 'Incident gateway',
      type: 2 as const,
      typeKey: 'webhook',
      options: { hookAuthType: 'Bearer' as const },
      configuredSecrets: ['hookUrl', 'hookAuthToken'] as const
    };
    const retained = noticeReceiverDraftFromDetail(evidence);
    expect(buildNoticeReceiverPayload(retained)).toEqual({
      id: 7,
      name: 'Incident gateway',
      type: 2,
      options: { hookAuthType: 'Bearer' }
    });

    const replaced = { ...retained, hookAuthToken: 'replacement' };
    expect(buildNoticeReceiverPayload(replaced).options).toEqual({
      hookAuthType: 'Bearer',
      hookAuthToken: 'replacement'
    });

    const cleared = setNoticeReceiverSecretCleared({ ...replaced, hookAuthType: 'None' }, 'hookAuthToken', true);
    expect(cleared.hookAuthToken).toBe('');
    expect(buildNoticeReceiverPayload(cleared).options).toEqual({
      hookAuthType: 'None',
      clearSecrets: ['hookAuthToken']
    });
  });

  it('clears secret ownership and stale options when the receiver type changes', () => {
    const draft = {
      ...createNoticeReceiverDraft(),
      type: 2 as const,
      name: 'Gateway',
      hookUrl: 'replacement',
      hookAuthToken: 'token',
      configuredSecrets: ['hookUrl', 'hookAuthToken'] as const,
      clearSecrets: ['hookAuthToken'] as const
    };
    const selected = selectNoticeReceiverType(draft, 1);
    expect(selected.configuredSecrets).toEqual([]);
    expect(selected.clearSecrets).toEqual([]);
    expect(buildNoticeReceiverPayload({ ...selected, email: 'ops@example.test' })).toEqual({
      name: 'Gateway',
      type: 1,
      options: { email: 'ops@example.test' }
    });
  });

  it('matches frozen required fields for WeCom, DingTalk, and FeiShu', () => {
    const wecom = {
      ...createNoticeReceiverDraft(),
      name: 'WeCom',
      type: 10 as const,
      corpId: 'corp',
      agentId: 1,
      appSecret: 'secret',
      userId: ''
    };
    expect(validateNoticeReceiverDraft(wecom)).toContain('recipientTarget');
    expect(validateNoticeReceiverDraft({ ...wecom, partyId: 'ops' })).toEqual([]);

    const dingtalk = { ...createNoticeReceiverDraft(), name: 'DingTalk', type: 5 as const, accessToken: 'token' };
    expect(validateNoticeReceiverDraft(dingtalk)).toEqual([]);

    const feishu = {
      ...createNoticeReceiverDraft(),
      name: 'FeiShu',
      type: 14 as const,
      appId: 'app',
      appSecret: 'secret',
      larkReceiveType: 1 as const
    };
    expect(validateNoticeReceiverDraft(feishu)).toContain('chatId');
    expect(validateNoticeReceiverDraft({ ...feishu, chatId: 'chat' })).toEqual([]);
  });

  it('validates only active enum and safe-integer options', () => {
    const webhook = {
      ...createNoticeReceiverDraft(),
      name: 'Webhook',
      type: 2 as const,
      hookUrl: 'secret',
      hookAuthType: 'Digest'
    };
    expect(validateNoticeReceiverDraft(webhook as never)).toContain('hookAuthType');

    const feishu = {
      ...createNoticeReceiverDraft(),
      name: 'FeiShu',
      type: 14 as const,
      appId: 'app',
      appSecret: 'secret',
      larkReceiveType: 4
    };
    expect(validateNoticeReceiverDraft(feishu as never)).toContain('larkReceiveType');

    const wecom = {
      ...createNoticeReceiverDraft(),
      name: 'WeCom',
      type: 10 as const,
      corpId: 'corp',
      appSecret: 'secret',
      userId: 'ops'
    };
    for (const agentId of [-1, 1.5, 2_147_483_648, Number.MAX_SAFE_INTEGER + 1]) {
      expect(validateNoticeReceiverDraft({ ...wecom, agentId })).toContain('agentId');
    }
    expect(validateNoticeReceiverDraft({ ...wecom, agentId: 0 })).toEqual([]);
    expect(validateNoticeReceiverDraft({ ...wecom, name: 'x'.repeat(101), agentId: 1 })).toContain('name');

    expect(
      validateNoticeReceiverDraft({
        ...createNoticeReceiverDraft(),
        name: 'Email',
        email: 'ops@example.test',
        hookAuthType: 'Digest',
        larkReceiveType: 4,
        agentId: -1
      } as never)
    ).toEqual([]);
  });

  it('rejects duplicate secret metadata at the draft boundary', () => {
    const webhook = {
      ...createNoticeReceiverDraft(),
      name: 'Webhook',
      type: 2 as const,
      hookUrl: 'secret',
      configuredSecrets: ['hookUrl', 'hookUrl'] as const,
      clearSecrets: ['hookAuthToken', 'hookAuthToken'] as const
    };

    expect(validateNoticeReceiverDraft(webhook)).toEqual(expect.arrayContaining(['configuredSecrets', 'clearSecrets']));
  });

  it('does not allow clearing a required configured secret', () => {
    const draft = noticeReceiverDraftFromDetail({
      id: 8,
      name: 'Slack',
      type: 8,
      typeKey: 'slack-webhook',
      options: {},
      configuredSecrets: ['slackWebHookUrl']
    });
    expect(validateNoticeReceiverDraft(setNoticeReceiverSecretCleared(draft, 'slackWebHookUrl', true))).toContain(
      'slackWebHookUrl'
    );
  });

  it('derives canonical public options and secret names without exposing secret values', () => {
    const draft = noticeReceiverDraftFromDetail({
      id: 7,
      name: 'Gateway',
      type: 2,
      typeKey: 'webhook',
      options: { hookAuthType: 'Bearer' },
      configuredSecrets: ['hookUrl', 'hookAuthToken']
    });
    const changed = {
      ...draft,
      hookUrl: 'replacement-url',
      hookAuthType: 'None' as const,
      clearSecrets: ['hookAuthToken'] as const
    };
    const expected = expectedNoticeReceiverEvidence(changed);
    expect(expected).toEqual({ options: { hookAuthType: 'None' }, configuredSecrets: ['hookUrl'] });
    expect(JSON.stringify(expected)).not.toContain('replacement-url');
  });

  it('does not expose secret-bearing channel settings in list summaries', () => {
    expect(
      noticeReceiverSettingSummary({
        id: 1,
        name: 'Slack',
        type: 8,
        typeKey: 'slack-webhook',
        options: {},
        configuredSecrets: ['slackWebHookUrl']
      })
    ).toEqual({ kind: 'configured' });
    expect(
      noticeReceiverSettingSummary({
        id: 2,
        name: 'Email',
        type: 1,
        typeKey: 'email',
        options: { email: 'ops@example.test' },
        configuredSecrets: []
      })
    ).toEqual({ kind: 'address', value: 'ops@example.test' });
  });
});
