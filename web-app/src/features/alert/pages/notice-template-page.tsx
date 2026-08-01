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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader, OperationalResultRegion } from '@/shared/operational-page';

import { NoticeTemplateOverlays } from '../components/notice-template-overlays';
import { NoticeTemplateRecoveryAlert } from '../components/notice-template-recovery-alert';
import { NoticeTemplateResults } from '../components/notice-template-results';
import { NoticeTemplateToolbar } from '../components/notice-template-toolbar';
import { useNoticeTemplateController } from '../controller/notice-template-controller';
import pageStyles from '../shared/notice-template-page.module.css';

const NOTICE_TEMPLATE_HEADING_ID = 'notice-template-heading';

export function NoticeTemplatePage() {
  const { t } = useTranslation();
  const controller = useNoticeTemplateController();
  const { state } = controller;
  const commandBusy =
    state.canRetainActiveOperation &&
    (state.command === 'saving' || state.command === 'deleting' || state.command === 'recovering');
  const busy = commandBusy || state.canRetainRecovery;
  const interactionBusy = busy || state.refreshing;

  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('noticeTemplates.title')}
        titleId={NOTICE_TEMPLATE_HEADING_ID}
        description={t('noticeTemplates.description')}
        actions={
          state.capabilities.canCreate ? (
            <Button type="primary" disabled={interactionBusy} onClick={controller.create}>
              {t('noticeTemplates.new')}
            </Button>
          ) : undefined
        }
      />
      <NoticeTemplateWorkspace
        controller={controller}
        busy={interactionBusy}
        commandBusy={commandBusy}
        refreshing={state.refreshing}
      />
      <NoticeTemplateOverlays
        busy={busy}
        canShowDraft={state.canSubmitDraft}
        draft={state.draft}
        preview={state.preview}
        onDraftChange={controller.updateDraft}
        onDraftClose={controller.closeDraft}
        onDraftSubmit={controller.submit}
        onPreviewClose={controller.closePreview}
      />
    </OperationalPage>
  );
}

type NoticeTemplateController = ReturnType<typeof useNoticeTemplateController>;

function NoticeTemplateWorkspace({
  controller,
  busy,
  commandBusy,
  refreshing
}: {
  controller: NoticeTemplateController;
  busy: boolean;
  commandBusy: boolean;
  refreshing: boolean;
}) {
  const { state } = controller;
  return (
    <section className={pageStyles.workspace} aria-labelledby={NOTICE_TEMPLATE_HEADING_ID}>
      <NoticeTemplateToolbar
        busy={busy}
        refreshing={refreshing}
        name={state.name}
        preset={state.query.preset}
        onNameChange={controller.setName}
        onPresetChange={controller.changePreset}
        onQuery={controller.query}
        onRefresh={controller.refresh}
      />
      <NoticeTemplateRecoveryAlert
        canRetry={state.canRetryRecovery}
        recovery={state.recovery}
        retryBusy={state.command === 'recovering'}
        retry={() => void controller.retryRecovery()}
      />
      <OperationalResultRegion>
        <NoticeTemplateResults
          busy={busy}
          capabilities={state.capabilities}
          retryDisabled={commandBusy}
          state={state.list}
          pageIndex={state.query.pageIndex}
          pageSize={state.query.pageSize}
          onPageChange={controller.changePage}
          onRetry={() => {
            if (state.recovery?.stage === 'projection' && state.canRetryRecovery) void controller.retryRecovery();
            else controller.refresh();
          }}
          onView={controller.setPreview}
          onEdit={controller.edit}
          onRemove={controller.remove}
        />
      </OperationalResultRegion>
    </section>
  );
}
