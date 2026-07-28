/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useSession } from '@/core/auth/session-context';

import { messageServerActionCapabilities } from '../model/message-server-action-capability';

export function useMessageServerActionCapabilities() {
  return messageServerActionCapabilities(useSession().session?.roles ?? []);
}
