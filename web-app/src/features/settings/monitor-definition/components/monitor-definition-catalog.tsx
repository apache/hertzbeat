/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorDefinitionCatalogItem } from '../model/monitor-definition-model';
import styles from './monitor-definition-catalog.module.css';

export function MonitorDefinitionCatalog(props: {
  items: MonitorDefinitionCatalogItem[];
  selectedApp: string | null;
  onSelect: (app: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.list}>
      {props.items.map(item => (
        <Button
          key={item.app}
          type={props.selectedApp === item.app ? 'primary' : 'text'}
          className={styles.item ?? ''}
          aria-label={`${item.label} ${item.app}`}
          onClick={() => props.onSelect(item.app)}
        >
          <span className={styles.copy}>
            <Typography.Text strong ellipsis>
              {item.label}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis>
              {item.app}
            </Typography.Text>
          </span>
          <Tag className={styles.origin ?? ''}>{t(`monitorDefinitions.originValue.${item.origin}`)}</Tag>
        </Button>
      ))}
    </div>
  );
}
