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

import type { RemotePageState } from '@/shared/remote-state';

import type { AlertSilence, AlertSilenceDraft, AlertSilenceQuery } from './alert-silence-model';

export type AlertSilenceListEvidence = RemotePageState<AlertSilence, 'unavailable' | 'error'>;

export type AlertSilenceDetailFailure = 'missing' | 'unavailable' | 'error';
export type AlertSilenceDetailState =
  | { kind: 'idle' }
  | { kind: 'loading'; id: number }
  | { kind: 'ready'; source: 'create'; draft: AlertSilenceDraft }
  | { kind: 'ready'; source: 'detail'; id: number; draft: AlertSilenceDraft }
  | { kind: AlertSilenceDetailFailure; id: number };

export type AlertSilenceViewState = {
  query: AlertSilenceQuery;
  search: string;
  detail: AlertSilenceDetailState;
  list: AlertSilenceListEvidence;
  busy: boolean;
  refreshing: boolean;
};

export type AlertSilenceViewActions = {
  setSearch: (value: string) => void;
  submitSearch: () => void;
  changePage: (page: number, pageSize: number) => void;
  refresh: () => void;
  create: () => void;
  edit: (id: number) => Promise<void>;
  cancel: () => void;
  updateDraft: (patch: Partial<AlertSilenceDraft>) => void;
  replaceDraft: (draft: AlertSilenceDraft) => void;
  save: () => Promise<void>;
  toggle: (silence: AlertSilence, enabled: boolean) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

export function alertSilenceDetailDraft(detail: AlertSilenceDetailState) {
  return detail.kind === 'ready' ? detail.draft : null;
}
