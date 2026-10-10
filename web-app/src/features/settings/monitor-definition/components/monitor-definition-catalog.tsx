/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorDefinitionCatalogItem } from '../model/monitor-definition-model';
import styles from './monitor-definition-catalog.module.css';

export function MonitorDefinitionCatalog(props: {
  items: MonitorDefinitionCatalogItem[];
  selectedApp: string | null;
  canWrite: boolean;
  pendingApp: string | null;
  onSelect: (app: string) => void;
  onVisibilityChange: (item: MonitorDefinitionCatalogItem) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.list}>
      {props.items.map(item => {
        const selected = props.selectedApp === item.app;
        return (
          <div key={item.app} className={styles.itemRow}>
            <Button
              type="text"
              className={`${styles.item ?? ''} ${selected ? (styles.itemSelected ?? '') : ''}`}
              aria-current={selected ? 'true' : undefined}
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
            <Popconfirm
              title={t('monitorDefinitions.visibilityConfirm', {
                app: item.app,
                state: t(`monitorDefinitions.visibilityState.${item.hidden ? 'hidden' : 'visible'}`),
                nextState: t(`monitorDefinitions.visibilityState.${item.hidden ? 'visible' : 'hidden'}`)
              })}
              okText={t('monitorDefinitions.apply')}
              cancelText={t('common.cancel')}
              onConfirm={() => props.onVisibilityChange(item)}
            >
              <Button
                type="text"
                icon={item.hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                aria-label={t('monitorDefinitions.visibilityAction', {
                  app: item.app,
                  state: t(`monitorDefinitions.visibilityState.${item.hidden ? 'hidden' : 'visible'}`)
                })}
                disabled={!props.canWrite || props.pendingApp !== null}
                loading={props.pendingApp === item.app}
              />
            </Popconfirm>
          </div>
        );
      })}
    </div>
  );
}
