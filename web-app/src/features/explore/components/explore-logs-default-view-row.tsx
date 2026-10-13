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

import { Button, Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { useSavedViewConfirmation } from './use-saved-view-confirmation';
import styles from './explore-logs-saved-views.module.css';
export function DefaultViewRow({
  model,
  pendingChanges
}: {
  model: SavedQueriesViewModel;
  pendingChanges: boolean | undefined;
}) {
  const { t } = useTranslation();
  const { open, setOpen, triggerRef } = useSavedViewConfirmation();
  return (
    <div className={styles.entry} data-active={!model.active}>
      <Popconfirm
        open={open}
        onOpenChange={setOpen}
        disabled={!pendingChanges}
        title={t(model.dirty ? 'exploreSaved.discardDraft' : 'common.unsavedChangesConfirm')}
        onConfirm={() => model.reopenDefault?.(true)}
      >
        <Button
          ref={triggerRef}
          type="text"
          className={styles.entryButton ?? ''}
          onClick={() => !pendingChanges && model.reopenDefault?.()}
        >
          {t('exploreSaved.myView')}
        </Button>
      </Popconfirm>
      <span className={styles.description}>{t('exploreSaved.defaultView')}</span>
      {!model.active && model.canWrite && (
        <Button
          type="link"
          size="small"
          className={styles.saveDefault ?? ''}
          disabled={model.saveBlocked || model.busy || Boolean(model.editor)}
          onClick={() => model.begin('create')}
        >
          {t('exploreSaved.saveAs')}
        </Button>
      )}
    </div>
  );
}
