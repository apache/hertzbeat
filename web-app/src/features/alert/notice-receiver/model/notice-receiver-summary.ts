/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { NoticeReceiver } from './notice-receiver-model';

export function noticeReceiverSettingSummary(
  receiver: NoticeReceiver
): { kind: 'address'; value: string } | { kind: 'configured' } {
  if (receiver.type === 0 && receiver.options.phone) return { kind: 'address', value: String(receiver.options.phone) };
  if (receiver.type === 1 && receiver.options.email) return { kind: 'address', value: String(receiver.options.email) };
  return { kind: 'configured' };
}
