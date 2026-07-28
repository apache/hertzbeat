/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
