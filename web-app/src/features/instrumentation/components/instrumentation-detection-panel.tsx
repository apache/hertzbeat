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

import { Alert, Button, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { SIGNALS, type DetectionResponse, type Signal } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-guide.module.css';

export function InstrumentationDetectionPanel(props: {
  response?: DetectionResponse;
  detecting: boolean;
  error: boolean;
  onRetry: () => void;
  onNewCheck: () => void;
  onOpen: (signal: Signal) => void;
}) {
  const { t } = useTranslation();
  if (props.error || !props.response) {
    const message = props.error
      ? 'instrumentation.detection.unavailable'
      : props.detecting
        ? 'instrumentation.detection.checking'
        : 'instrumentation.detection.notStarted';
    return (
      <Alert
        type={props.error ? 'error' : 'info'}
        showIcon
        message={t(message)}
        action={
          props.error || !props.detecting ? (
            <Button type={props.error ? 'default' : 'primary'} onClick={props.onRetry}>
              {t(props.error ? 'instrumentation.action.retryDetection' : 'instrumentation.action.startDetection')}
            </Button>
          ) : undefined
        }
      />
    );
  }
  return (
    <section className={styles.detection} aria-labelledby="instrumentation-detection-title">
      <Typography.Title id="instrumentation-detection-title" level={4}>
        {t('instrumentation.stage.detect')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('instrumentation.detection.fixedWindow', {
          start: new Date(props.response.context.startedAt).toISOString(),
          end: new Date(props.response.context.windowEndAt).toISOString()
        })}
      </Typography.Text>
      <Typography.Text type="secondary">{t('instrumentation.detection.observationOnly')}</Typography.Text>
      {props.response.detectedAt >= props.response.context.windowEndAt && (
        <Typography.Text type="secondary">{t('instrumentation.detection.windowComplete')}</Typography.Text>
      )}
      {SIGNALS.map(signal => (
        <SignalRow key={signal} signal={signal} response={props.response!} onOpen={props.onOpen} />
      ))}
      {props.response.polling.decision === 'manual_retry' && (
        <Button onClick={props.onRetry}>{t('instrumentation.action.retryDetection')}</Button>
      )}
      <Button disabled={props.detecting} onClick={props.onNewCheck}>
        {t('instrumentation.action.newDetection')}
      </Button>
    </section>
  );
}

function SignalRow(props: { signal: Signal; response: DetectionResponse; onOpen: (signal: Signal) => void }) {
  const { t } = useTranslation();
  const result = props.response.signals[props.signal];
  const jump = props.response.queryJumps.find(item => item.signal === props.signal);
  const missedWindow = result.status === 'waiting' && props.response.detectedAt >= props.response.context.windowEndAt;
  return (
    <div className={styles.signalRow}>
      <Space>
        <strong>{t(`instrumentation.signal.${props.signal}`)}</strong>
        <Tag color={missedWindow ? 'default' : statusColor(result.status)}>
          {t(
            missedWindow ? 'instrumentation.detection.notObserved' : `instrumentation.detection.status.${result.status}`
          )}
        </Tag>
      </Space>
      {result.lastReceivedAt && (
        <Typography.Text type="secondary">
          {t('instrumentation.detection.lastReceived', { time: new Date(result.lastReceivedAt).toISOString() })}
        </Typography.Text>
      )}
      {result.errorCode && (
        <Typography.Text type="secondary">
          {t(
            missedWindow
              ? 'instrumentation.detection.noneInWindow'
              : `instrumentation.detection.error.${result.errorCode}`,
            { defaultValue: t('common.unavailable') }
          )}
        </Typography.Text>
      )}
      <Button size="small" disabled={!jump?.enabled} onClick={() => props.onOpen(props.signal)}>
        {t('instrumentation.action.openExplore')}
      </Button>
    </div>
  );
}

function statusColor(status: string | undefined) {
  if (status === 'received') return 'success';
  if (status === 'waiting') return 'processing';
  if (status === 'unsupported') return 'default';
  return 'error';
}
