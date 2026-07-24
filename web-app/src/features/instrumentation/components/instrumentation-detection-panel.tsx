/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
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
  onOpen: (signal: Signal) => void;
}) {
  const { t } = useTranslation();
  if (props.error) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('instrumentation.detection.unavailable')}
        action={<Button onClick={props.onRetry}>{t('instrumentation.action.retryDetection')}</Button>}
      />
    );
  }
  if (!props.response) {
    return (
      <Alert
        type="info"
        showIcon
        message={t(props.detecting ? 'instrumentation.detection.checking' : 'instrumentation.detection.notStarted')}
        action={
          !props.detecting ? (
            <Button onClick={props.onRetry}>{t('instrumentation.action.retryDetection')}</Button>
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
      {SIGNALS.map(signal => (
        <SignalRow key={signal} signal={signal} response={props.response!} onOpen={props.onOpen} />
      ))}
      {props.response.polling.decision === 'manual_retry' && (
        <Button onClick={props.onRetry}>{t('instrumentation.action.retryDetection')}</Button>
      )}
    </section>
  );
}

function SignalRow(props: { signal: Signal; response: DetectionResponse; onOpen: (signal: Signal) => void }) {
  const { t } = useTranslation();
  const result = props.response.signals[props.signal];
  const jump = props.response.queryJumps.find(item => item.signal === props.signal);
  return (
    <div className={styles.signalRow}>
      <Space>
        <strong>{t(`instrumentation.signal.${props.signal}`)}</strong>
        <Tag color={statusColor(result.status)}>{t(`instrumentation.detection.status.${result.status}`)}</Tag>
      </Space>
      {result.lastReceivedAt && (
        <Typography.Text type="secondary">{new Date(result.lastReceivedAt).toLocaleString()}</Typography.Text>
      )}
      {result.errorCode && (
        <Typography.Text type="secondary">
          {t(`instrumentation.detection.error.${result.errorCode}`, { defaultValue: t('common.unavailable') })}
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
