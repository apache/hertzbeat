/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InstrumentationDraft } from '../model/instrumentation-flow';
import type {
  CatalogResponse,
  DetectionResponse,
  GuideBlock,
  RenderResponse,
  Signal
} from '../model/instrumentation-v2-contract';
import { InstrumentationDetectionPanel } from './instrumentation-detection-panel';
import { InstrumentationGuideBlocks } from './instrumentation-guide-blocks';
import { translateBackend } from './instrumentation-i18n';
import styles from './instrumentation-guide.module.css';

export function InstrumentationGuideWorkspace(props: {
  catalog: CatalogResponse;
  draft: InstrumentationDraft;
  guide: RenderResponse;
  token: string;
  detection?: DetectionResponse;
  detecting: boolean;
  detectionError: boolean;
  onCopy: (block: GuideBlock) => Promise<void>;
  onEdit: () => void;
  onDetect: () => void;
  onOpen: (signal: Signal) => void;
}) {
  return (
    <div className={styles.workspace}>
      <SelectionSummary catalog={props.catalog} draft={props.draft} onEdit={props.onEdit} />
      <InstrumentationGuideBlocks guide={props.guide} token={props.token} onCopy={props.onCopy} />
      <DestinationRail {...props} />
    </div>
  );
}

function SelectionSummary(props: { catalog: CatalogResponse; draft: InstrumentationDraft; onEdit: () => void }) {
  const { t } = useTranslation();
  const source = props.catalog.sources.find(item => item.id === props.draft.sourceId);
  const dimensions = ['framework', 'method', 'environment', 'platform'] as const;
  return (
    <aside className={styles.summary}>
      <div className={styles.railHeading}>
        <Typography.Text strong>{t('instrumentation.v2.selection')}</Typography.Text>
        <Button size="small" type="link" onClick={props.onEdit}>
          {t('common.edit')}
        </Button>
      </div>
      {source && (
        <SummaryRow label={t('instrumentation.v2.sourceLabel')} value={translateBackend(t, source.labelKey)} />
      )}
      {dimensions.map(field =>
        props.draft[field] ? (
          <SummaryRow
            key={field}
            label={t(`instrumentation.field.${field === 'environment' ? 'deploymentEnvironment' : field}`)}
            value={t(`instrumentation.${field}.${props.draft[field]}`, { defaultValue: props.draft[field] })}
          />
        ) : null
      )}
      <SummaryRow label={t('instrumentation.field.serviceName')} value={props.draft.service.name} />
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Text>{value}</Typography.Text>
    </div>
  );
}

function DestinationRail(props: Parameters<typeof InstrumentationGuideWorkspace>[0]) {
  const { t } = useTranslation();
  const endpoints = Object.entries(props.guide.intakeProfile.httpsEndpoints);
  return (
    <aside className={styles.statusRail}>
      <Typography.Text strong>{t('instrumentation.v2.destination')}</Typography.Text>
      <Typography.Text>{t(`instrumentation.v2.profileKind.${props.guide.intakeProfile.kind}`)}</Typography.Text>
      {endpoints.map(([transport, endpoint]) => (
        <code key={transport}>{endpoint}</code>
      ))}
      <Typography.Text type={props.token ? 'success' : 'secondary'}>
        {t(props.token ? 'instrumentation.token.ready' : 'instrumentation.token.notGenerated')}
      </Typography.Text>
      <Button type="primary" loading={props.detecting} onClick={props.onDetect}>
        {t('instrumentation.action.startDetection')}
      </Button>
      <InstrumentationDetectionPanel
        {...(props.detection ? { response: props.detection } : {})}
        detecting={props.detecting}
        error={props.detectionError}
        onRetry={props.onDetect}
        onOpen={props.onOpen}
      />
    </aside>
  );
}
