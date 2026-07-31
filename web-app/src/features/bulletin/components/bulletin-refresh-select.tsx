/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  bulletinRefreshChoices,
  type BulletinRefreshChoice,
  type BulletinRefreshSeconds
} from '../model/bulletin-refresh-model';

export function BulletinRefreshSelect({
  disabled,
  value,
  onChange
}: {
  disabled: boolean;
  value: BulletinRefreshSeconds;
  onChange: (value: BulletinRefreshChoice) => unknown;
}) {
  const { t } = useTranslation();
  return (
    <Select<BulletinRefreshSeconds>
      aria-label={t('bulletin.autoRefresh.label')}
      value={value}
      disabled={disabled}
      onChange={selected => onChange(selected)}
      options={bulletinRefreshChoices.map(choice => ({
        value: choice,
        label: choice === 0 ? t('bulletin.autoRefresh.off') : t('bulletin.autoRefresh.seconds', { count: choice })
      }))}
    />
  );
}
