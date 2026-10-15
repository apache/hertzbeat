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

import type { FormEvent } from 'react';
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import styles from './explore-logs-saved-views.module.css';

export function ViewsRailEditor({ model }: { model: SavedQueriesViewModel }) {
  const { t } = useTranslation();
  const editor = model.editor!;
  return (
    <form
      className={styles.editor}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void model.save();
      }}
    >
      <label>
        {t('exploreSaved.name')}
        <Input
          autoFocus
          maxLength={255}
          value={editor.label}
          disabled={model.busy}
          onChange={event => model.edit('label', event.target.value)}
        />
      </label>
      <label>
        {t('exploreSaved.description')}
        <Input.TextArea
          maxLength={512}
          value={editor.description}
          disabled={model.busy}
          onChange={event => model.edit('description', event.target.value)}
        />
      </label>
      <div className={styles.editorActions}>
        <Button onClick={model.closeEditor} disabled={model.busy}>
          {t('common.cancel')}
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          disabled={model.saveBlocked || model.busy || !editor.label.trim()}
          loading={model.busy}
        >
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
