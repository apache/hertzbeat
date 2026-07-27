/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';

import { noticeActionCapabilities } from '../model/notice-action-capability-model';

/** Maps the current session to Notice mutation permissions shared by receiver, rule, and template flows. */
export function useNoticeActionCapabilities() {
  return noticeActionCapabilities(useSession().session?.roles ?? []);
}
