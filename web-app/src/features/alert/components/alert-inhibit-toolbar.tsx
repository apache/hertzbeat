/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../alert-policy-page.module.css';

type AlertInhibitToolbarProps = {
  search: string;
  refreshing: boolean;
  setSearch: (value: string) => void;
  submitSearch: () => void;
  refresh: () => unknown;
};

export function AlertInhibitToolbar({
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
        value={search}
        placeholder={t('alertInhibits.search')}
        onChange={event => setSearch(event.target.value)}
        onPressEnter={submitSearch}
      />
      <Button type="primary" onClick={submitSearch}>
        {t('common.query')}
      </Button>
      <Button loading={refreshing} onClick={() => void refresh()}>
        {t('common.refresh')}
      </Button>
    </div>
  );
}
