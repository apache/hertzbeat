/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Checkbox, Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';
import { readSavedQuery, type SavedQueryRead, type SavedQueryRecord } from '../model/explore-saved-query-model';
import { pendingSavedViewChanges, type SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { SavedViewActions } from './explore-logs-view-actions';
import { useSavedViewConfirmation } from './use-saved-view-confirmation';
import styles from './explore-logs-saved-views.module.css';

export function SavedViewRow({
  record,
  model,
  inspect,
  favorite
}: {
  record: SavedQueryRecord;
  model: SavedQueriesViewModel;
  inspect: (record: SavedQueryRecord) => void;
  favorite: boolean;
}) {
  const { t } = useTranslation();
  const { open, setOpen, triggerRef } = useSavedViewConfirmation();
  const result = readSavedQuery(record);
  const active = model.active?.viewKey === record.viewKey;
  const pendingChanges = pendingSavedViewChanges(model);
  return (
    <div className={styles.entry} data-active={active}>
      <div className={styles.entryHeading}>
        <Popconfirm
          open={open}
          onOpenChange={setOpen}
          disabled={!pendingChanges}
          title={t(model.dirty ? 'exploreSaved.discardDraft' : 'common.unsavedChangesConfirm')}
          onConfirm={() => model.reopen(record, true)}
        >
          <Button
            ref={triggerRef}
            type="text"
            className={styles.entryButton ?? ''}
            disabled={result.kind !== 'ready' || model.busy}
            onClick={() => !pendingChanges && model.reopen(record)}
          >
            {record.label}
          </Button>
        </Popconfirm>
        <Checkbox
          checked={favorite}
          aria-label={t(favorite ? 'exploreSaved.removeFavorite' : 'exploreSaved.addFavorite', { view: record.label })}
          onChange={() => model.toggleFavorite?.(record.viewKey)}
        />
      </div>
      <SavedViewDescription record={record} result={result} />
      {active && (
        <SavedViewActions record={record} model={model} unavailable={result.kind !== 'ready'} inspect={inspect} />
      )}
    </div>
  );
}

function SavedViewDescription({ record, result }: { record: SavedQueryRecord; result: SavedQueryRead }) {
  const { t } = useTranslation();
  return (
    <span className={styles.description} title={record.description ?? undefined}>
      {result.kind === 'ready'
        ? record.description || result.query.query || '*'
        : t(`exploreSaved.reasons.${result.reason}`)}
    </span>
  );
}
