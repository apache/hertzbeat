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

import type { NoticeTemplateActionCapabilities } from '../model/notice-template-action-capability';
import type { NoticeTemplateEditorController } from './use-notice-template-editor-controller';
import type { NoticeTemplateOperationController } from './use-notice-template-operation-controller';

export function useNoticeTemplateRoleLossRetirement({
  capabilities,
  editor,
  operation
}: {
  capabilities: NoticeTemplateActionCapabilities;
  editor: NoticeTemplateEditorController;
  operation: NoticeTemplateOperationController;
}) {
  const previousRef = useRef(capabilities);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = capabilities;
    const lostCapability =
      (previous.canCreate && !capabilities.canCreate) ||
      (previous.canEdit && !capabilities.canEdit) ||
      (previous.canDelete && !capabilities.canDelete);
    if (!lostCapability) return;
    operation.retireUnauthorized(capabilities);
    editor.controls.retireUnauthorized(capabilities);
  }, [capabilities, editor.controls, operation]);
}
