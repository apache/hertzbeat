/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Dropdown, Modal, Pagination, Select, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BulletinActionCapabilities } from '../model/bulletin-action-capability';
import {
  bulletinPageSizes,
  type Bulletin,
  type BulletinMetricsState,
  type BulletinQuery
} from '../model/bulletin-model';
import styles from '../bulletin-page.module.css';
import { BulletinMetricsPanel } from './bulletin-metrics';

type BulletinWorkspaceActions = {
  changePage: (page: number, pageSize: number) => unknown;
  edit: (id: number) => unknown;
  remove: (record: Bulletin) => unknown;
  removeMany: (ids: readonly number[]) => unknown;
  select: (id: number) => unknown;
  selectIds: (ids: number[]) => unknown;
};

type BulletinWorkspaceProps = {
  actions: BulletinWorkspaceActions;
  capabilities: BulletinActionCapabilities;
  listKind: 'idle' | 'loading' | 'correcting' | 'ready' | 'empty' | 'invalid' | 'permission' | 'unavailable' | 'error';
  metrics: BulletinMetricsState;
  query: BulletinQuery;
  records: Bulletin[];
  selectedId: number | null;
  selectedIds: number[];
  total: number;
  readLocked: boolean;
  writeLocked: boolean;
};

/** Keeps Bulletin navigation and metric inspection in one workspace, matching the original operator flow. */
export function BulletinWorkspace(props: BulletinWorkspaceProps) {
  const [deleteCurrentOpen, setDeleteCurrentOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const firstId = props.records[0]?.id;
  useEffect(() => {
    // The original workspace opens its first tab; publish that choice through
    // the controller so metric loading has one authoritative selection owner.
    if (props.listKind === 'ready' && props.selectedId == null && firstId != null && !props.readLocked) {
      props.actions.select(firstId);
    }
  }, [firstId, props.actions, props.listKind, props.readLocked, props.selectedId]);
  if (props.listKind !== 'ready' || props.records.length === 0) return null;

  const activeId = props.selectedId ?? props.records[0]!.id;
  const current = props.records.find(record => record.id === activeId) ?? props.records[0]!;

  return (
    <>
      <BulletinTabs
        {...props}
        activeId={activeId}
        current={current}
        openBatchDelete={() => setBatchDeleteOpen(true)}
        openCurrentDelete={() => setDeleteCurrentOpen(true)}
      />
      <Pagination
        className={styles.workspacePagination!}
        current={props.query.pageIndex + 1}
        pageSize={props.query.pageSize}
        total={props.total}
        showSizeChanger
        pageSizeOptions={[...bulletinPageSizes]}
        disabled={props.readLocked}
        onChange={props.actions.changePage}
      />
      <BulletinDeleteDialogs
        {...props}
        current={current}
        deleteCurrentOpen={deleteCurrentOpen}
        batchDeleteOpen={batchDeleteOpen}
        closeCurrent={() => setDeleteCurrentOpen(false)}
        closeBatch={() => setBatchDeleteOpen(false)}
      />
    </>
  );
}

function BulletinTabs(
  props: BulletinWorkspaceProps & {
    activeId: number;
    current: Bulletin;
    openBatchDelete: () => void;
    openCurrentDelete: () => void;
  }
) {
  return (
    <Tabs
      type="card"
      activeKey={String(props.activeId)}
      onChange={key => props.actions.select(Number(key))}
      tabBarExtraContent={<BulletinActionsMenu {...props} />}
      items={props.records.map(record => ({
        key: String(record.id),
        label: record.name,
        disabled: props.readLocked,
        children: record.id === props.activeId ? <BulletinMetricsPanel state={props.metrics} /> : null
      }))}
    />
  );
}

function BulletinActionsMenu(
  props: BulletinWorkspaceProps & {
    current: Bulletin;
    openBatchDelete: () => void;
    openCurrentDelete: () => void;
  }
) {
  const { t } = useTranslation();
  if (!props.capabilities.canWrite && !props.capabilities.canDelete) return null;
  const openAction = (key: string) => {
    if (key === 'edit' && props.capabilities.canWrite) void props.actions.edit(props.current.id);
    if (key === 'delete' && props.capabilities.canDelete) props.openCurrentDelete();
    if (key === 'batch-delete' && props.capabilities.canDelete) props.openBatchDelete();
  };
  const deleteItems = props.capabilities.canDelete
    ? [
        { key: 'delete', label: t('bulletin.delete'), danger: true },
        { key: 'batch-delete', label: t('bulletin.deleteSelected'), danger: true }
      ]
    : [];
  return (
    <Dropdown
      trigger={['click']}
      disabled={props.writeLocked}
      menu={{
        items: [...(props.capabilities.canWrite ? [{ key: 'edit', label: t('common.edit') }] : []), ...deleteItems],
        onClick: ({ key }) => openAction(key)
      }}
    >
      <Button disabled={props.writeLocked}>{t('common.actions')}</Button>
    </Dropdown>
  );
}

function BulletinDeleteDialogs(
  props: BulletinWorkspaceProps & {
    current: Bulletin;
    deleteCurrentOpen: boolean;
    batchDeleteOpen: boolean;
    closeCurrent: () => void;
    closeBatch: () => void;
  }
) {
  const { t } = useTranslation();
  const cancelBatch = () => {
    props.closeBatch();
    props.actions.selectIds([]);
  };
  return (
    <>
      <Modal
        open={props.deleteCurrentOpen}
        title={t('bulletin.delete')}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true, disabled: props.writeLocked }}
        onCancel={props.closeCurrent}
        onOk={() => {
          props.closeCurrent();
          void props.actions.remove(props.current);
        }}
      >
        {t('bulletin.deleteConfirm')}
      </Modal>
      <Modal
        open={props.batchDeleteOpen}
        title={t('bulletin.deleteSelected')}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        destroyOnHidden
        okButtonProps={{ danger: true, disabled: props.writeLocked || props.selectedIds.length === 0 }}
        onCancel={cancelBatch}
        onOk={() => {
          props.closeBatch();
          void props.actions.removeMany(props.selectedIds);
        }}
      >
        <Select
          mode="multiple"
          aria-label={t('bulletin.deleteSelected')}
          value={props.selectedIds}
          disabled={props.writeLocked}
          options={props.records.map(record => ({ value: record.id, label: record.name }))}
          placeholder={t('bulletin.deleteSelectedPlaceholder')}
          onChange={props.actions.selectIds}
        />
      </Modal>
    </>
  );
}
