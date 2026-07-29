/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { UseQueryResult } from '@tanstack/react-query';

import { classifyMessageServerReadError } from '../api/message-server-api';

export type MessageServerChannelState<T> =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'permission' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'invalid' }
  | { kind: 'configured'; config: T };

export function messageServerChannelState<T>(
  query: UseQueryResult<
    { status: 'configured'; revision: string; config: T } | { status: 'missing'; revision: 'missing'; config: null }
  >
): MessageServerChannelState<T> {
  if (query.isPending) return { kind: 'loading' };
  if (query.error) return { kind: classifyMessageServerReadError(query.error) };
  if (!query.data) return { kind: 'error' };
  return query.data.status === 'configured' ? { kind: 'configured', config: query.data.config } : { kind: 'missing' };
}
