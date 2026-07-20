/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../alert-policy-page.module.css';

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
    <div className={styles.toolbar}>
      <Input
        allowClear
        disabled={busy}
        value={search}
        placeholder={t('alertInhibits.search')}
        onChange={event => setSearch(event.target.value)}
        onPressEnter={submitSearch}
      />
      <Button type="primary" disabled={busy} onClick={submitSearch}>
        {t('common.query')}
      </Button>
      <Button loading={refreshing} disabled={busy} onClick={() => void refresh()}>
        {t('common.refresh')}
      </Button>
    </div>
  );
}
