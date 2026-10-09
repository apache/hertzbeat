/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
