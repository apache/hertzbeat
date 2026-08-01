/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CatalogResponse } from '../model/instrumentation-v2-contract';
import { translateBackend } from './instrumentation-i18n';
import styles from './instrumentation-shell.module.css';

export function InstrumentationSourceCategoryRail(props: {
  catalog: CatalogResponse;
  groupId?: string;
  onGroup: (groupId: string | undefined) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className={styles.categoryRail} aria-label={t('instrumentation.v2.directory.categories')}>
      <Button
        className={`${styles.categoryAction} ${props.groupId ? '' : styles.categoryActionSelected}`}
        type="text"
        aria-current={props.groupId ? undefined : 'true'}
        onClick={() => props.onGroup(undefined)}
      >
        {t('instrumentation.v2.directory.all')} <span>{props.catalog.sources.length}</span>
      </Button>
      {props.catalog.groups.map(group => (
        <Button
          key={group.id}
          className={`${styles.categoryAction} ${props.groupId === group.id ? styles.categoryActionSelected : ''}`}
          type="text"
          aria-current={props.groupId === group.id ? 'true' : undefined}
          onClick={() => props.onGroup(group.id)}
        >
          {translateBackend(t, group.labelKey)}{' '}
          <span>{props.catalog.sources.filter(source => source.groupIds.includes(group.id)).length}</span>
        </Button>
      ))}
    </nav>
  );
}
