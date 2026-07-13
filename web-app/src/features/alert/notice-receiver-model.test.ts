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
  noticeReceiverSettingSummary,
  validateNoticeReceiverDraft
} from './notice-receiver-model';

describe('notice receiver model', () => {
  it('builds the master receiver pagination contract', () => {
    expect(buildNoticeReceiverListPath({ name: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/notice/receivers?pageIndex=0&pageSize=8');
    expect(buildNoticeReceiverListPath({ name: 'on-call', pageIndex: 1, pageSize: 15 }))
      .toBe('/api/notice/receivers?pageIndex=1&pageSize=15&name=on-call');
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
      hookUrl: 'https://hooks.example.test/alert',
      hookAuthType: 'Bearer',
      hookAuthToken: 'secret-token'
    });
  });

  it('does not expose secret-bearing channel settings in list summaries', () => {
    expect(noticeReceiverSettingSummary({ id: 1, type: 8, slackWebHookUrl: 'https://hooks.slack.com/services/secret' }))
      .toEqual({ kind: 'configured' });
    expect(noticeReceiverSettingSummary({ id: 2, type: 1, email: 'ops@example.test' }))
      .toEqual({ kind: 'address', value: 'ops@example.test' });
  });
});
