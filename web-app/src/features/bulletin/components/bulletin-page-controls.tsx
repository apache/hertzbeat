/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalPageHeader, OperationalSearchControl } from '@/shared/operational-page';

import type { BulletinActionCapabilities } from '../model/bulletin-action-capability';
import type { BulletinRefreshChoice, BulletinRefreshSeconds } from '../model/bulletin-refresh-model';
import { BulletinRefreshSelect } from './bulletin-refresh-select';

type BulletinPageControlsProps = {
  actions: {
    create: () => unknown;
    refresh: () => unknown;
    setRefreshSeconds: (value: BulletinRefreshChoice) => unknown;
    setSearch: (value: string) => unknown;
    submitSearch: () => unknown;
  };
  capabilities: BulletinActionCapabilities;
  commandActive: boolean;
  refreshing: boolean;
  refreshSeconds: BulletinRefreshSeconds;
  search: string;
  writeLocked: boolean;
};

export function BulletinPageControls({
  actions,
  capabilities,
  commandActive,
  refreshing,
  refreshSeconds,
  search,
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
        <OperationalSearchControl
          ariaLabel={t('bulletin.search')}
          value={search}
          placeholder={t('bulletin.search')}
          submitLabel={t('common.query')}
          disabled={commandActive}
          onChange={actions.setSearch}
          onSubmit={actions.submitSearch}
        />
      }
      secondary={
        <Space wrap>
          <Button loading={refreshing} disabled={commandActive} onClick={() => void actions.refresh()}>
            {t('common.refresh')}
          </Button>
          <BulletinRefreshSelect value={refreshSeconds} disabled={commandActive} onChange={actions.setRefreshSeconds} />
        </Space>
      }
    />
  );
}
