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

import { Alert, Button, Descriptions, Empty, Skeleton, Typography } from 'antd';
import type { TFunction } from 'i18next';

import type { TraceSpan } from '../model/explore-signal-contract';
import { traceDurationMs, type TraceDetailState } from '../model/explore-signal-model';
import { OtlpAttributeList, OtlpAttributeSection } from './otlp-attribute-list';
import { formatTraceDuration } from './trace-display';
import styles from './trace-result.module.css';

type Props = {
  state: Exclude<TraceDetailState, { kind: 'closed' }>;
  t: TFunction;
  close: () => void;
  selectSpan: (spanId: string) => void;
  retry: () => Promise<void>;
  openRelatedLogs: () => void;
  openRelatedMetrics: () => void;
};

export function TraceDetail({ state, t, close, selectSpan, retry, openRelatedLogs, openRelatedMetrics }: Props) {
  const title = state.kind === 'ready' ? state.detail.rootSpanName ?? t('exploreTrace.detail') : t('exploreTrace.detail');
  return (
    <aside className={styles.detailPane} aria-label={title}>
      <div className={styles.detailHeader}>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Button size="small" onClick={close}>{t('exploreTrace.closeDetail')}</Button>
      </div>
      <div className={styles.detailBody}>
        {state.kind === 'loading' && <Skeleton active paragraph={{ rows: 10 }} />}
        {state.kind === 'missing' && <Empty description={t('explore.empty.traces')} />}
        {state.kind === 'unavailable' && (
          <TraceFailure type="warning" message={t('common.unavailable')} retry={retry} t={t} />
        )}
        {state.kind === 'error' && (
          <TraceFailure type="error" message={t('exploreTrace.loadFailed')} retry={retry} t={t} />
        )}
        {state.kind === 'ready' && (
          <TraceDetailContent
            state={state}
            t={t}
            selectSpan={selectSpan}
            openRelatedLogs={openRelatedLogs}
            openRelatedMetrics={openRelatedMetrics}
          />
        )}
      </div>
    </aside>
  );
}

function TraceFailure({ type, message, retry, t }: {
  type: 'warning' | 'error';
  message: string;
  retry: () => Promise<void>;
  t: TFunction;
}) {
  return (
    <Alert
      type={type}
      showIcon
      message={message}
      action={<Button onClick={() => { void retry(); }}>{t('common.retry')}</Button>}
    />
  );
}

function TraceDetailContent({ state, t, selectSpan, openRelatedLogs, openRelatedMetrics }: {
  state: Extract<TraceDetailState, { kind: 'ready' }>;
  t: TFunction;
  selectSpan: (spanId: string) => void;
  openRelatedLogs: () => void;
  openRelatedMetrics: () => void;
}) {
  const { detail, spans, selected } = state;
  return (
    <>
      <div className={styles.detailToolbar}>
        <div className={styles.traceSummary}>
          <strong>{formatTraceDuration(traceDurationMs(detail))}</strong>
          <span>{spans.length} {t('exploreTrace.spans')}</span>
          <span>{detail.errorSpanCount ?? '—'} {t('exploreTrace.errors')}</span>
        </div>
        <div className={styles.actions}>
          <Button onClick={openRelatedLogs}>{t('explore.relatedLogs')}</Button>
          <Button onClick={openRelatedMetrics}>{t('exploreTrace.relatedMetrics')}</Button>
        </div>
      </div>
      <div className={styles.waterfall}>
        {spans.map((span) => (
          <button
            key={span.spanId}
            type="button"
            data-selected={span.spanId === selected?.spanId}
            className={styles.spanRow}
            onClick={() => { if (span.spanId) selectSpan(span.spanId); }}
          >
            <span className={styles.spanName} style={{ paddingLeft: `${span.depth * 16 + 8}px` }}>
              <strong>{span.serviceName ?? '—'}</strong>
              <small>{span.spanName ?? '—'}</small>
            </span>
            <span className={styles.track}>
              <i
                data-error={span.status === 'error'}
                style={{
                  left: `${span.offsetPercent}%`,
                  width: `${Math.min(span.widthPercent, 100 - span.offsetPercent)}%`,
                }}
              />
            </span>
            <span className={styles.spanDuration}>{formatTraceDuration(traceDurationMs(span))}</span>
          </button>
        ))}
      </div>
      {selected && <SpanDetail span={selected} t={t} />}
    </>
  );
}

function SpanDetail({ span, t }: { span: TraceSpan; t: TFunction }) {
  return (
    <section className={styles.spanDetail}>
      <Typography.Title level={4}>{span.spanName}</Typography.Title>
      <Descriptions
        size="small"
        column={2}
        bordered
        items={[
          { key: 'span', label: t('explore.spanId'), children: span.spanId ?? '—' },
          { key: 'kind', label: t('exploreTrace.kind'), children: span.spanKind ?? '—' },
          { key: 'status', label: t('exploreTrace.status'), children: span.status ?? '—' },
          { key: 'scope', label: t('exploreTrace.scope'), children: span.scopeName ?? '—' },
        ]}
      />
      <OtlpAttributeSection title={t('exploreTrace.spanAttributes')} value={span.spanAttributes ?? undefined} />
      <OtlpAttributeSection title={t('exploreTrace.resourceAttributes')} value={span.resourceAttributes ?? undefined} />
      <TraceEvents span={span} t={t} />
    </section>
  );
}

function TraceEvents({ span, t }: { span: TraceSpan; t: TFunction }) {
  return (
    <section className={styles.events}>
      <Typography.Title level={5}>{t('exploreTrace.events')}</Typography.Title>
      {(span.events ?? []).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        span.events?.map((event, index) => (
          <div key={`${event.name ?? 'event'}-${index}`}>
            <strong>{event.name ?? '—'}</strong>
            <OtlpAttributeList value={event.attributes ?? undefined} />
          </div>
        ))
      )}
    </section>
  );
}
