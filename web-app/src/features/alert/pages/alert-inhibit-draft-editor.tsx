/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { AlertInhibitEditor } from '../components/alert-inhibit-editor';
import type { useAlertInhibitController } from '../controller/use-alert-inhibit-controller';

export function AlertInhibitDraftEditor({ controller }: { controller: ReturnType<typeof useAlertInhibitController> }) {
  const { command, draft, editorFailure, prefill, recovery } = controller.state;
  if (!draft) return null;
  return (
    <AlertInhibitEditor
      draft={draft}
      busy={command !== 'idle'}
      saving={command === 'saving'}
      failure={editorFailure}
      prefill={prefill}
      recovery={recovery?.kind === 'save' ? recovery : undefined}
      retrying={command !== 'recovering'}
      labelKeys={controller.state.labelSuggestions.keys}
      update={controller.updateDraft}
      close={controller.closeDraft}
      submit={controller.submit}
      retry={controller.retry}
    />
  );
}
