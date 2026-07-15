/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ExportOutlined } from '@ant-design/icons';
import { Alert, Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { INSTRUMENTATION_SIGNALS } from './instrumentation-contract';
import { buildExploreHandoff } from './instrumentation-flow-model';
import { StageBody } from './instrumentation-stage-content';
import type { useInstrumentationDetection } from './use-instrumentation-detection';
import styles from './instrumentation-page.module.css';

type DetectionController = ReturnType<typeof useInstrumentationDetection>;

export function InstrumentationDetection({ detection }: { detection: DetectionController }) {
  const { t } = useTranslation();
  const response = detection.response;
  return (
    <StageBody stage={5} title={t('instrumentation.stage.detect')} description={t('instrumentation.stage.detectHelp')}>
      {detection.error != null && (
        <Alert
          type="error"
          showIcon
          title={t('instrumentation.detection.unavailable')}
          action={<Button size="small" onClick={detection.retry}>{t('common.retry')}</Button>}
        />
      )}
      {detection.checking && !response && <Alert type="info" showIcon title={t('instrumentation.detection.checking')} />}
      {!detection.error && !detection.checking && !response && (
        <Alert type="info" showIcon title={t('instrumentation.detection.notStarted')} />
      )}
      {response && (
        <div className={styles.signalTable}>
          {INSTRUMENTATION_SIGNALS.map(signal => {
            const result = response.signals[signal];
            const jump = response.queryJumps.find(item => item.signal === signal && item.enabled);
            return (
              <div className={styles.signalRow} key={signal}>
                <strong>{t(`instrumentation.signal.${signal}`)}</strong>
                <span>
                  <Tag color={statusColor(result.status)}>{t(`instrumentation.detection.status.${result.status}`)}</Tag>
                  <Typography.Text type="secondary">
                    {result.lastReceivedAt ? new Date(result.lastReceivedAt).toLocaleString() : errorText(result.errorCode, t)}
                  </Typography.Text>
                </span>
                {jump ? (
                  <Button type="link" href={buildExploreHandoff(signal, jump.context)} icon={<ExportOutlined />} iconPlacement="end">
                    {t('instrumentation.action.openExplore')}
                  </Button>
                ) : <Typography.Text type="secondary">{t('instrumentation.queryUnavailable')}</Typography.Text>}
              </div>
            );
          })}
        </div>
      )}
      {response?.polling.decision === 'continue_polling' && <Alert type="info" showIcon title={t('instrumentation.detection.waiting')} />}
      {response?.polling.decision === 'manual_retry' && (
        <div className={styles.stageActions}><Button onClick={detection.retry}>{t('instrumentation.action.retryDetection')}</Button></div>
      )}
    </StageBody>
  );
}

function statusColor(status: string) {
  if (status === 'received') return 'success';
  if (status === 'waiting') return 'processing';
  if (status === 'unsupported') return 'default';
  if (status === 'unavailable') return 'warning';
  return 'error';
}

function errorText(code: string | null, t: (key: string) => string) {
  return code ? t(`instrumentation.detection.error.${code}`) : t('common.unavailable');
}
