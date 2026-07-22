/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { RemotePageState } from '@/shared/remote-state';

import type { AlertGroupConverge, AlertGroupFailure, AlertGroupPage } from './alert-group-model';

export type AlertGroupListState = RemotePageState<AlertGroupConverge, 'unavailable' | 'error'>;
export type AlertGroupDetailState =
  { kind: 'idle' } | { kind: 'loading'; id: number } | { kind: AlertGroupFailure; id: number };

export function resolveAlertGroupListState(
  pending: boolean,
  failure: 'unavailable' | 'error' | null,
  page: AlertGroupPage | undefined
): AlertGroupListState {
  if (pending) return { kind: 'loading' };
  if (failure) return { kind: failure };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
