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

import { Input, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { type SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { SavedQueryTimeSummary } from './saved-query-time-summary';
import styles from './explore-saved-queries.module.css';

export function ExploreSavedQueryEditor({ model }: { model: SavedQueriesViewModel }) {
  const { t } = useTranslation();
  const editor = model.editor;
  return (
    <Modal
      open={Boolean(editor)}
      title={t(`exploreSaved.editor.${editor?.mode ?? 'create'}`)}
      onCancel={model.closeEditor}
      onOk={() => void model.save()}
      confirmLoading={model.busy}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        disabled: !model.canWrite || model.saveBlocked || !editor?.label.trim() || editor.label.trim().length > 255
      }}
      cancelButtonProps={{ disabled: model.busy }}
      closable={!model.busy}
      maskClosable={!model.busy}
    >
      {editor && (
        <div className={styles.editor}>
          <Typography.Paragraph type="secondary">{t('exploreSaved.shared')}</Typography.Paragraph>
          <Typography.Paragraph>
            <SavedQueryTimeSummary query={model.query} />
          </Typography.Paragraph>
          <label>
            {t('exploreSaved.name')}
            <Input
              aria-label={t('exploreSaved.name')}
              maxLength={255}
              value={editor.label}
              disabled={model.busy}
              onChange={event => model.edit('label', event.target.value)}
            />
          </label>
          <label>
            {t('exploreSaved.description')}
            <Input.TextArea
              aria-label={t('exploreSaved.description')}
              maxLength={512}
              value={editor.description}
              disabled={model.busy}
              onChange={event => model.edit('description', event.target.value)}
            />
          </label>
          {!(model.query.signal === 'logs' && model.query.live) && (
            <Typography.Text type="secondary">{t('exploreSaved.firstPage')}</Typography.Text>
          )}
          {model.error && (
            <Typography.Paragraph type="danger" role="alert">
              {t(`exploreSaved.${model.error}`)}
            </Typography.Paragraph>
          )}
        </div>
      )}
    </Modal>
  );
}
