/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalSearchControl } from '@/shared/operational-page';

type AlertInhibitToolbarProps = {
  busy: boolean;
  search: string;
  refreshing: boolean;
  setSearch: (value: string) => void;
  submitSearch: () => void;
  refresh: () => unknown;
};

export function AlertInhibitToolbar({
  busy,
  search,
  refreshing,
  setSearch,
  submitSearch,
  refresh
}: AlertInhibitToolbarProps) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('alertInhibits.search')}
      primary={
        <OperationalSearchControl
          ariaLabel={t('alertInhibits.search')}
          disabled={busy}
          value={search}
          placeholder={t('alertInhibits.search')}
          submitLabel={t('common.query')}
          onChange={setSearch}
          onSubmit={submitSearch}
        />
      }
      secondary={
        <Button loading={refreshing} disabled={busy} onClick={() => void refresh()}>
          {t('common.refresh')}
        </Button>
      }
    />
  );
}
