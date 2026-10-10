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

import { Alert, Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { ManagedRuntimeConfigView } from '../model/collector-runtime-config-model';

export function CollectorRuntimeSourceSummary({
  config,
  onManagePrometheus,
  onManageFileLog
}: {
  config: ManagedRuntimeConfigView;
  onManagePrometheus: () => void;
  onManageFileLog: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Alert
      type="info"
      showIcon
      message={t('collectors.runtime.sources')}
      description={
        <Space direction="vertical" size="small">
          <Typography.Text>
            {t('collectors.runtime.schemaRevision', { schema: config.schemaVersion, revision: config.revision })}
          </Typography.Text>
          {config.schemaVersion < 3 && (
            <Typography.Text type="warning">{t('collectors.runtime.upgradeNotice')}</Typography.Text>
          )}
          <Typography.Text>
            {t('collectors.runtime.prometheusSummary', { count: config.prometheusTargetCount })}
          </Typography.Text>
          <Button onClick={onManagePrometheus}>{t('collectors.runtime.prometheus.manage')}</Button>
          <Typography.Text>
            {t('collectors.runtime.fileLogSummary', { count: config.fileLogSourceCount })}
          </Typography.Text>
          <Button onClick={onManageFileLog}>{t('collectors.runtime.fileLog.manage')}</Button>
          <Typography.Text type="secondary">{t('collectors.runtime.sourceNotice')}</Typography.Text>
        </Space>
      }
    />
  );
}
