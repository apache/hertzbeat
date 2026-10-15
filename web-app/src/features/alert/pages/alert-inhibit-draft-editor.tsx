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
      labelSuggestions={controller.state.labelSuggestions}
      update={controller.updateDraft}
      close={controller.closeDraft}
      submit={controller.submit}
      retry={controller.retry}
    />
  );
}
