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

import type { DataProvider } from '@refinedev/core';

import type { NoticeRule } from '../model/notice-rule-model';
import type { NoticeRuleFailureKind } from '../model/notice-rule-failure';
import type { NoticeRuleActionCapabilities } from '../model/notice-rule-action-capability';
import type { NoticeRuleCommandGate } from './notice-rule-command-gate';
import type { NoticeRuleEditorController } from './notice-rule-editor-controller';
import type { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

type WriteFailure = Exclude<NoticeRuleFailureKind, 'missing'>;

export type NoticeRuleCommandNotifications = {
  validation: () => void;
  saveSuccess: () => void;
  deleteSuccess: () => void;
  proofFailure: (failure: 'unavailable' | 'error' | 'commit-uncertain') => void;
  saveFailure: (failure: WriteFailure) => void;
  deleteFailure: (failure: WriteFailure) => void;
};

export type NoticeRuleCommandContext = {
  capabilities: NoticeRuleActionCapabilities;
  list: ReturnType<typeof useNoticeRuleList>;
  options: ReturnType<typeof useNoticeRuleOptions>;
  provider: DataProvider;
  gate: NoticeRuleCommandGate;
  editor: NoticeRuleEditorController;
  loadDetail: (id: number) => Promise<NoticeRule>;
  notify: NoticeRuleCommandNotifications;
};
