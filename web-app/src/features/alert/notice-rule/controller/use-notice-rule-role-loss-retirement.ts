/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
