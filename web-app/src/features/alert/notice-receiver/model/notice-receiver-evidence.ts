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

import { expectedNoticeReceiverEvidence, type NoticeReceiver, type NoticeReceiverDraft } from './notice-receiver-model';
import { NoticeReceiverRequestFailure, noticeReceiverRereadError } from './notice-receiver-failure';

/** Proves that a detail response belongs to the requested receiver identity. */
export function requireExactNoticeReceiver(receiver: NoticeReceiver, id: number) {
  if (receiver.id !== id) {
    throw new NoticeReceiverRequestFailure('invalid', 'uncertain', {
      code: 'NOTICE_RECEIVER_DETAIL_ID_MISMATCH'
    });
  }
  return receiver;
}

/** Proves that a deleted receiver is absent from the authoritative projection. */
export function requireNoticeReceiverAbsent(records: NoticeReceiver[], id: number) {
  if (records.some(record => record.id === id)) {
    throw noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_DELETE_NOT_CONVERGED');
  }
}

/** Compares only public fields and secret-presence names; secret values never enter evidence. */
export function requireNoticeReceiverConverged(receiver: NoticeReceiver, id: number, draft: NoticeReceiverDraft) {
  const expected = expectedNoticeReceiverEvidence(draft);
  if (
    receiver.id !== id ||
    receiver.name !== draft.name.trim() ||
    receiver.type !== draft.type ||
    !sameRecord(receiver.options, expected.options) ||
    !sameStrings(receiver.configuredSecrets, expected.configuredSecrets)
  ) {
    throw noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_REREAD_INVALID');
  }
  return receiver;
}

function sameRecord(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
  return keys.every(key => actual[key] === expected[key]);
}

function sameStrings(actual: readonly string[], expected: readonly string[]) {
  const actualValues = new Set(actual);
  const expectedValues = new Set(expected);
  return (
    actualValues.size === actual.length &&
    expectedValues.size === expected.length &&
    actualValues.size === expectedValues.size &&
    actual.every(item => expectedValues.has(item))
  );
}
