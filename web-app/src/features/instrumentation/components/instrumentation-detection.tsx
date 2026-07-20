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

import type { DetectionResponse, InstrumentationSignal } from '../model/instrumentation-contract';
import { StageBody } from './instrumentation-stage';
import styles from './instrumentation-guide.module.css';
import stageStyles from './instrumentation-stage.module.css';

type InstrumentationDetectionViewState =
  | { status: 'idle' }
  | { status: 'checking'; response?: DetectionResponse }
  | { status: 'complete'; response: DetectionResponse }
  | { status: 'manual_retry'; response: DetectionResponse }
  | { status: 'error'; error: unknown };

export interface InstrumentationDetectionView {
  state: InstrumentationDetectionViewState;
  signalNames: readonly InstrumentationSignal[];
  retry: () => void;
  queryHandoff: (signal: InstrumentationSignal) => string | undefined;
  openQuery: (signal: InstrumentationSignal) => void;
}

export function InstrumentationDetection({ detection }: { detection: InstrumentationDetectionView }) {
  const { t } = useTranslation();
  return (
    <StageBody stage={5} title={t('instrumentation.stage.detect')} description={t('instrumentation.stage.detectHelp')}>
      <DetectionState detection={detection} t={t} />
    </StageBody>
  );
}

function DetectionState({ detection, t }: { detection: InstrumentationDetectionView; t: (key: string) => string }) {
  const { state } = detection;
  switch (state.status) {
    case 'idle':
      return <Alert type="info" showIcon message={t('instrumentation.detection.notStarted')} />;
    case 'checking':
      return state.response ? (
        <>
          <SignalTable detection={detection} response={state.response} t={t} />
          <Alert type="info" showIcon message={t('instrumentation.detection.waiting')} />
        </>
      ) : (
        <Alert type="info" showIcon message={t('instrumentation.detection.checking')} />
      );
    case 'complete':
      return <SignalTable detection={detection} response={state.response} t={t} />;
    case 'manual_retry':
      return (
        <>
          <SignalTable detection={detection} response={state.response} t={t} />
          <div className={stageStyles.stageActions}>
            <Button onClick={detection.retry}>{t('instrumentation.action.retryDetection')}</Button>
          </div>
        </>
      );
    case 'error':
      return (
        <Alert
          type="error"
          showIcon
          message={t('instrumentation.detection.unavailable')}
          action={
            <Button size="small" onClick={detection.retry}>
              {t('common.retry')}
            </Button>
          }
        />
      );
    default:
      return assertNever(state);
  }
}

function SignalTable({
  detection,
  response,
  t
}: {
  detection: InstrumentationDetectionView;
  response: DetectionResponse;
  t: (key: string) => string;
}) {
  return (
    <div className={styles.signalTable}>
      {detection.signalNames.map(signal => {
        const result = response.signals[signal];
        const queryAvailable = detection.queryHandoff(signal) !== undefined;
        return (
          <div className={styles.signalRow} key={signal}>
            <strong>{t(`instrumentation.signal.${signal}`)}</strong>
            <span>
              <Tag color={statusColor(result.status)}>{t(`instrumentation.detection.status.${result.status}`)}</Tag>
              <Typography.Text type="secondary">
                {result.lastReceivedAt
                  ? new Date(result.lastReceivedAt).toLocaleString()
                  : errorText(result.errorCode, t)}
              </Typography.Text>
            </span>
            {queryAvailable ? (
              <Button
                type="link"
                onClick={() => detection.openQuery(signal)}
                icon={<ExportOutlined />}
                iconPosition="end"
              >
                {t('instrumentation.action.openExplore')}
              </Button>
            ) : (
              <Typography.Text type="secondary">{t('instrumentation.queryUnavailable')}</Typography.Text>
            )}
          </div>
        );
      })}
    </div>
  );
}

function assertNever(value: never): never {
  void value;
  throw new Error('Unhandled instrumentation detection state');
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
