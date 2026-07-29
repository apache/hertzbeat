/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationAction } from '../model/collector-model';

type Props = {
  canWrite: boolean;
  canDelete: boolean;
  name: string;
  selected: string[];
  mutating: boolean;
  refreshing: boolean;
  onDeploy: () => void;
  onName: (name: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
};

export function CollectorToolbar(props: Props) {
  const { t } = useTranslation();
  const disabled = props.mutating || props.selected.length === 0;
  return (
    <div>
      <Input
        allowClear
        value={props.name}
        disabled={props.mutating}
        placeholder={t('collectors.search')}
        onChange={event => props.onName(event.target.value)}
        onPressEnter={props.onSearch}
      />
      <Button type="primary" disabled={props.mutating} onClick={props.onSearch}>
        {t('collectors.searchAction')}
      </Button>
      <Button disabled={props.mutating} loading={props.refreshing && !props.mutating} onClick={props.onRefresh}>
        {t('common.refresh')}
      </Button>
      {props.canWrite && (
        <>
          <Button disabled={props.mutating} onClick={props.onDeploy}>
            {t('collectors.deploy.action')}
          </Button>
          <Button disabled={disabled} onClick={() => props.onAction('online', props.selected)}>
            {t('collectors.takeSelectedOnline')}
          </Button>
          <Button disabled={disabled} onClick={() => props.onAction('offline', props.selected)}>
            {t('collectors.takeSelectedOffline')}
          </Button>
        </>
      )}
      {props.canDelete && (
        <Button danger disabled={disabled} onClick={() => props.onAction('delete', props.selected)}>
          {t('collectors.deleteSelected')}
        </Button>
      )}
    </div>
  );
}
