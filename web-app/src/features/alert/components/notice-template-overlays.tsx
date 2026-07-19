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

import { Drawer } from 'antd';

import editorStyles from '../notice-template-editor.module.css';
import { NoticeTemplateEditor } from '../notice-template-editor';
import type { NoticeTemplateDraft, NoticeTemplateResourceRecord } from '../notice-template-model';

type NoticeTemplateOverlaysProps = {
  busy: boolean;
  draft: NoticeTemplateDraft | null;
  preview: NoticeTemplateResourceRecord | null;
  onDraftChange: (patch: Partial<NoticeTemplateDraft>) => void;
  onDraftClose: () => void;
  onDraftSubmit: () => void | Promise<void>;
  onPreviewClose: () => void;
};

export function NoticeTemplateOverlays({
  busy,
  draft,
  preview,
  onDraftChange,
  onDraftClose,
  onDraftSubmit,
  onPreviewClose
}: NoticeTemplateOverlaysProps) {
  return (
    <>
      {draft && !busy && (
        <NoticeTemplateEditor
          draft={draft}
          saving={false}
          update={onDraftChange}
          close={() => !busy && onDraftClose()}
          submit={() => !busy && void onDraftSubmit()}
        />
      )}
      <Drawer
        width={720}
        open={preview != null}
        title={preview?.name}
        closable={!busy}
        keyboard={!busy}
        maskClosable={!busy}
        onClose={() => !busy && onPreviewClose()}
      >
        {preview && <pre className={editorStyles.preview}>{preview.content}</pre>}
      </Drawer>
    </>
  );
}
