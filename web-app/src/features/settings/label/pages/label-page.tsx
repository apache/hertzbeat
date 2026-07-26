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

import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';
import { useStringQueryDraft } from '@/shared/query-context';

import { LabelEditor } from '../components/label-editor';
import { useLabelEditorController } from '../controller/label-editor-controller';
import { useLabelQueryController } from '../controller/label-query-controller';
import { useLabelResourceController } from '../controller/label-resource-controller';
import { LabelPageActions, LabelWorkspace } from './label-page-workspace';

export function LabelPage() {
  const { t } = useTranslation();
  const queryController = useLabelQueryController();
  const { query, reconcileConfirmedDelete, setSearch } = queryController;
  const resource = useLabelResourceController(query, reconcileConfirmedDelete);
  const { value: draftSearch, setValue: setDraftSearch } = useStringQueryDraft(query.search, query.search);
  const editor = useLabelEditorController(resource);
  const writeLocked = resource.isLocked();
  const submitSearch = () => {
    const search = draftSearch.trim();
    setDraftSearch(search);
    setSearch(search);
  };
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('labels.title')}
        description={t('labels.description')}
        actions={<LabelPageActions locked={writeLocked} onCreate={editor.actions.create} />}
      />
      <LabelWorkspace
        queryController={queryController}
        resource={resource}
        editor={editor}
        writeLocked={writeLocked}
        draftSearch={draftSearch}
        onSearchChange={setDraftSearch}
        onSubmitSearch={submitSearch}
      />
      {editor.state.editor && (
        <LabelEditor
          editor={editor.state.editor}
          locked={writeLocked}
          saving={resource.isSaving}
          onCancel={editor.actions.close}
          onSubmit={editor.actions.submit}
        />
      )}
    </OperationalPage>
  );
}
