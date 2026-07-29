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

import type { NoticeTemplateDraft, NoticeTemplateResourceRecord } from './notice-template-model';
import type { NoticeTemplateActionKind } from './notice-template-action-capability';

export type NoticeTemplateCommand = 'idle' | 'loading-detail' | 'saving' | 'deleting' | 'recovering';

/** Durable in-session receipt describing the only safe continuation after a partial write transaction. */
export type NoticeTemplateRecovery =
  | { stage: 'projection'; action: NoticeTemplateActionKind }
  | { stage: 'update-proof'; draft: NoticeTemplateDraft }
  | { stage: 'delete-proof'; id: number; record: NoticeTemplateResourceRecord }
  | { stage: 'commit-uncertain'; draft: NoticeTemplateDraft };
