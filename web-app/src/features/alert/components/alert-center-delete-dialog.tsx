/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Modal, Radio } from 'antd';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { maximumAlertEvidenceIds } from '../model/alert-model';
import styles from './alert-center-delete-dialog.module.css';

type DeleteScope = 'selected' | 'filtered';

type AlertCenterDeleteActions = {
  cancelPreparation: () => void;
  prepareFiltered: () => Promise<number[]>;
  removeFiltered: (ids: number[]) => void | Promise<unknown>;
  removeSelected: () => void | Promise<unknown>;
};

export function AlertCenterDeleteDialog({
  actions,
  busy,
  filteredTotal,
  selectedCount
}: {
  actions: AlertCenterDeleteActions;
  busy: boolean;
  filteredTotal: number;
  selectedCount: number;
}) {
  const { t } = useTranslation();
  const dialog = useDeleteDialogState(actions, filteredTotal);

  return (
    <>
      <Button size="small" danger disabled={busy} onClick={dialog.openDialog}>
        {t('alert.deleteSelected')}
      </Button>
      <Modal
        className={styles.dialog ?? ''}
        footer={null}
        open={dialog.open}
        title={t(dialog.preparedIds ? 'alert.deleteScope.reviewTitle' : 'alert.deleteScope.title')}
        width={560}
        onCancel={dialog.close}
      >
        {dialog.preparedIds ? (
          <DeleteReview count={dialog.preparedIds.length} />
        ) : (
          <DeleteScopeSelection dialog={dialog} filteredTotal={filteredTotal} selectedCount={selectedCount} />
        )}
        <DeleteDialogFooter busy={busy} dialog={dialog} />
      </Modal>
    </>
  );
}

function useDeleteDialogState(actions: AlertCenterDeleteActions, filteredTotal: number) {
  const preparationAttempt = useRef(0);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<DeleteScope>('selected');
  const [preparing, setPreparing] = useState(false);
  const [prepareFailed, setPrepareFailed] = useState(false);
  const [preparedIds, setPreparedIds] = useState<number[] | null>(null);
  const overLimit = filteredTotal > maximumAlertEvidenceIds;
  const close = () => {
    preparationAttempt.current += 1;
    actions.cancelPreparation();
    setOpen(false);
    setScope('selected');
    setPreparing(false);
    setPrepareFailed(false);
    setPreparedIds(null);
  };
  const reviewFiltered = async () => {
    if (preparing || overLimit) return;
    const attempt = ++preparationAttempt.current;
    setPreparing(true);
    setPrepareFailed(false);
    try {
      const ids = await actions.prepareFiltered();
      if (preparationAttempt.current !== attempt) return;
      if (ids.length === 0) setPrepareFailed(true);
      else setPreparedIds(ids);
    } catch {
      if (preparationAttempt.current === attempt) setPrepareFailed(true);
    } finally {
      if (preparationAttempt.current === attempt) setPreparing(false);
    }
  };
  const removeSelected = () => {
    void actions.removeSelected();
    close();
  };
  const removeFiltered = () => {
    if (!preparedIds) return;
    void actions.removeFiltered(preparedIds);
    close();
  };
  return {
    back: () => setPreparedIds(null),
    close,
    open,
    openDialog: () => setOpen(true),
    overLimit,
    prepareFailed,
    preparedIds,
    preparing,
    removeFiltered,
    removeSelected,
    reviewFiltered,
    scope,
    selectScope: (value: DeleteScope) => {
      preparationAttempt.current += 1;
      actions.cancelPreparation();
      setScope(value);
      setPreparing(false);
      setPrepareFailed(false);
    }
  };
}

type DeleteDialogState = ReturnType<typeof useDeleteDialogState>;

function DeleteScopeSelection({
  dialog,
  filteredTotal,
  selectedCount
}: {
  dialog: DeleteDialogState;
  filteredTotal: number;
  selectedCount: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p className={styles.intro}>{t('alert.deleteScope.description')}</p>
      <Radio.Group
        className={styles.scopeGroup ?? ''}
        value={dialog.scope}
        onChange={event => dialog.selectScope(event.target.value as DeleteScope)}
      >
        <DeleteScopeOption
          description={t('alert.deleteScope.selectedDescription')}
          title={t('alert.deleteScope.selectedTitle', { count: selectedCount })}
          value="selected"
        />
        <DeleteScopeOption
          description={t('alert.deleteScope.filteredDescription')}
          title={t('alert.deleteScope.filteredTitle', { count: filteredTotal })}
          value="filtered"
        />
      </Radio.Group>
      {dialog.scope === 'filtered' && dialog.overLimit ? (
        <p className={styles.limit}>{t('alert.deleteScope.limitDescription', { limit: maximumAlertEvidenceIds })}</p>
      ) : null}
      {dialog.prepareFailed ? <p className={styles.prepareFailure}>{t('alert.deleteScope.prepareFailure')}</p> : null}
    </>
  );
}

function DeleteDialogFooter({ busy, dialog }: { busy: boolean; dialog: DeleteDialogState }) {
  const { t } = useTranslation();
  return (
    <div className={styles.footer}>
      {dialog.preparedIds ? (
        <Button disabled={busy || dialog.preparing} onClick={dialog.back}>
          {t('common.back')}
        </Button>
      ) : null}
      <Button disabled={busy || dialog.preparing} onClick={dialog.close}>
        {t('common.cancel')}
      </Button>
      <DeletePrimaryAction busy={busy} dialog={dialog} />
    </div>
  );
}

function DeletePrimaryAction({ busy, dialog }: { busy: boolean; dialog: DeleteDialogState }) {
  const { t } = useTranslation();
  if (dialog.preparedIds) {
    return (
      <Button key="confirm-filtered" danger type="primary" disabled={busy} onClick={dialog.removeFiltered}>
        {t('alert.deleteScope.confirmFiltered')}
      </Button>
    );
  }
  if (dialog.scope === 'selected') {
    return (
      <Button danger type="primary" disabled={busy} onClick={dialog.removeSelected}>
        {t('alert.deleteScope.confirmSelected')}
      </Button>
    );
  }
  return (
    <Button
      key="review-filtered"
      danger
      type="primary"
      disabled={busy || dialog.overLimit}
      loading={dialog.preparing}
      onClick={() => void dialog.reviewFiltered()}
    >
      {t('alert.deleteScope.review')}
    </Button>
  );
}

function DeleteScopeOption({ description, title, value }: { description: string; title: string; value: DeleteScope }) {
  return (
    <Radio className={styles.scopeOption ?? ''} value={value}>
      <span className={styles.scopeCopy}>
        <span className={styles.scopeTitle}>{title}</span>
        <span className={styles.scopeDescription}>{description}</span>
      </span>
    </Radio>
  );
}

function DeleteReview({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className={styles.review}>
      <div className={styles.reviewCount}>
        <strong>{count}</strong>
        <span>{t('alert.deleteScope.reviewCount')}</span>
      </div>
      <p className={styles.reviewDescription}>{t('alert.deleteScope.reviewDescription', { count })}</p>
    </div>
  );
}
