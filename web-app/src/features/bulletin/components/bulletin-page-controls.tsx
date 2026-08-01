/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Popconfirm, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalPageHeader } from '@/shared/operational-page';

import type { BulletinActionCapabilities } from '../model/bulletin-action-capability';
import type { BulletinRefreshChoice, BulletinRefreshSeconds } from '../model/bulletin-refresh-model';
import styles from '../bulletin-page.module.css';
import { BulletinRefreshSelect } from './bulletin-refresh-select';

type BulletinPageControlsProps = {
  actions: {
    create: () => unknown;
    refresh: () => unknown;
    removeMany: (ids: readonly number[]) => unknown;
    setRefreshSeconds: (value: BulletinRefreshChoice) => unknown;
    setSearch: (value: string) => unknown;
    submitSearch: () => unknown;
  };
  capabilities: BulletinActionCapabilities;
  commandActive: boolean;
  refreshing: boolean;
  refreshSeconds: BulletinRefreshSeconds;
  search: string;
  selectedIds: number[];
  writeLocked: boolean;
};

export function BulletinPageControls({
  actions,
  capabilities,
  commandActive,
  refreshing,
  refreshSeconds,
  search,
  selectedIds,
  writeLocked
}: BulletinPageControlsProps) {
  const { t } = useTranslation();
  return (
    <>
      <OperationalPageHeader
        title={t('bulletin.title')}
        description={t('bulletin.description')}
        actions={
          <Space wrap>
            {capabilities.canDelete && selectedIds.length > 0 && (
              <Popconfirm
                title={t('bulletin.deleteSelectedConfirm', { count: selectedIds.length })}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => actions.removeMany(selectedIds)}
              >
                <Button danger disabled={writeLocked}>
                  {t('bulletin.deleteSelected')}
                </Button>
              </Popconfirm>
            )}
            {capabilities.canWrite && (
              <Button type="primary" disabled={writeLocked} onClick={actions.create}>
                {t('bulletin.create')}
              </Button>
            )}
          </Space>
        }
      />
      <BulletinToolbar
        actions={actions}
        commandActive={commandActive}
        refreshing={refreshing}
        refreshSeconds={refreshSeconds}
        search={search}
      />
    </>
  );
}

function BulletinToolbar({
  actions,
  commandActive,
  refreshing,
  refreshSeconds,
  search
}: Pick<BulletinPageControlsProps, 'actions' | 'commandActive' | 'refreshing' | 'refreshSeconds' | 'search'>) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('bulletin.search')}
      primary={
        <Input
          className={styles.searchInput}
          value={search}
          placeholder={t('bulletin.search')}
          disabled={commandActive}
          onChange={event => actions.setSearch(event.target.value)}
          onPressEnter={actions.submitSearch}
        />
      }
      secondary={
        <Space wrap>
          <Button type="primary" disabled={commandActive} onClick={actions.submitSearch}>
            {t('common.query')}
          </Button>
          <Button loading={refreshing} disabled={commandActive} onClick={() => void actions.refresh()}>
            {t('common.refresh')}
          </Button>
          <BulletinRefreshSelect value={refreshSeconds} disabled={commandActive} onChange={actions.setRefreshSeconds} />
        </Space>
      }
    />
  );
}
