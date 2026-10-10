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

import { useEffect, useRef } from 'react';

import type { NoticeRuleActionCapabilities } from '../model/notice-rule-action-capability';
import type { NoticeRuleCommandGate } from './notice-rule-command-gate';
import type { NoticeRuleEditorController } from './notice-rule-editor-controller';

export function useNoticeRuleRoleLossRetirement(options: {
  capabilities: NoticeRuleActionCapabilities;
  editor: NoticeRuleEditorController;
  gate: NoticeRuleCommandGate;
}) {
  const previousRef = useRef(options.capabilities);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = options.capabilities;
    if (!lostAnyCapability(previous, options.capabilities)) return;
    options.gate.retireUnauthorized(options.capabilities);
    options.editor.retireUnauthorized(options.capabilities);
  }, [options.capabilities, options.editor, options.gate]);
}

function lostAnyCapability(previous: NoticeRuleActionCapabilities, current: NoticeRuleActionCapabilities) {
  return (
    (previous.canCreate && !current.canCreate) ||
    (previous.canEdit && !current.canEdit) ||
    (previous.canToggle && !current.canToggle) ||
    (previous.canDelete && !current.canDelete)
  );
}
