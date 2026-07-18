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

import styles from "./alert-policy-page.module.css";
import { NoticeTemplateOverlays } from "./components/notice-template-overlays";
import { NoticeTemplateResults } from "./components/notice-template-results";
import { NoticeTemplateToolbar } from "./components/notice-template-toolbar";
import { useNoticeTemplateController } from "./notice-template-controller";

export function NoticeTemplatePage() {
  const controller = useNoticeTemplateController();
  const { state } = controller;

  return (
    <div className={styles.page}>
      <NoticeTemplateToolbar
        name={state.name}
        preset={state.query.preset}
        onNameChange={controller.setName}
        onPresetChange={controller.changePreset}
        onQuery={controller.query}
        onRefresh={controller.refresh}
        onCreate={controller.create}
      />
      <NoticeTemplateResults
        state={state.list}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        onPageChange={controller.changePage}
        onRetry={controller.refresh}
        onView={controller.setPreview}
        onEdit={controller.edit}
        onRemove={controller.remove}
      />
      <NoticeTemplateOverlays
        busy={state.command !== "idle"}
        saving={state.command === "saving"}
        draft={state.draft}
        preview={state.preview}
        onDraftChange={controller.updateDraft}
        onDraftClose={controller.closeDraft}
        onDraftSubmit={controller.submit}
        onPreviewClose={controller.closePreview}
      />
    </div>
  );
}
