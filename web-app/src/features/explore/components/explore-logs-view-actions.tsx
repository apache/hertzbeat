/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Dropdown, Modal } from 'antd';
import { useState } from 'react';
import { EllipsisOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { SavedQueryRecord } from '../model/explore-saved-query-model';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import styles from './explore-logs-saved-views.module.css';

export function SavedViewActions({
  record,
  model,
  unavailable,
  inspect
}: {
  record: SavedQueryRecord;
  model: SavedQueriesViewModel;
  unavailable: boolean;
  inspect: (record: SavedQueryRecord) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.rowActions}>
      {unavailable && (
        <Button type="link" size="small" onClick={() => inspect(record)}>
          {t('exploreSaved.inspect')}
        </Button>
      )}
      <Button
        type="link"
        size="small"
        disabled={!model.activeChanged || model.saveBlocked || model.busy || !model.canWrite || Boolean(model.editor)}
        onClick={() => void model.updateActive?.()}
      >
        {t('exploreSaved.saveChanges')}
      </Button>
      {model.canWrite && (
        <>
          <Button
            type="link"
            size="small"
            disabled={model.saveBlocked || model.busy || Boolean(model.editor)}
            onClick={() => model.begin('copy')}
          >
            {t('exploreSaved.saveAs')}
          </Button>
          <Button
            type="link"
            size="small"
            disabled={model.saveBlocked || model.busy || Boolean(model.editor)}
            onClick={() => model.begin('update')}
          >
            {t('exploreSaved.editView')}
          </Button>
        </>
      )}
      <ViewMoreActions record={record} model={model} inspect={inspect} />
    </div>
  );
}

function ViewMoreActions({
  record,
  model,
  inspect
}: {
  record: SavedQueryRecord;
  model: SavedQueriesViewModel;
  inspect: (record: SavedQueryRecord) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const more = (key: string) => {
    if (key === 'inspect') inspect(record);
    if (key === 'delete') Modal.confirm({ title: t('exploreSaved.deleteConfirm'), onOk: () => model.remove(record) });
  };
  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      menu={{
        items: [
          { key: 'inspect', label: t('exploreSaved.inspect') },
          {
            key: 'delete',
            label: t('common.delete'),
            danger: true,
            disabled: !model.canWrite || model.busy || Boolean(model.editor)
          }
        ],
        onClick: ({ key }) => {
          setOpen(false);
          more(key);
        }
      }}
    >
      <Button
        type="text"
        size="small"
        icon={<EllipsisOutlined aria-hidden />}
        aria-label={t('exploreSaved.moreActions')}
        onKeyDown={event => {
          if (event.key !== 'Escape' || !open) return;
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }}
      />
    </Dropdown>
  );
}
