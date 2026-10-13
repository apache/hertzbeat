import type { SpanFilterControls } from '../model/explore-span-filter';
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

import { Button } from 'antd';
import { SpanEvidenceTabs } from './explore-span-evidence-tabs';
import { LeftOutlined, RightOutlined, CopyOutlined, CloseOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HertzBeatTraceGanttQueryOutcome } from '@/platform/perses';
import { formatShortLocalTime } from '@/shared/time';
import { investigationDurationNanoToMillis } from '../model/explore-investigation-model';
import { formatTraceDuration } from './trace-display';
import { OtlpAttributeSection } from './otlp-attribute-list';
import { useEvidenceCopy } from './explore-evidence-copy';
import styles from './explore-investigation-trace.module.css';
import { focusTraceInspector } from './explore-trace-inspector-focus';

type Span = NonNullable<Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>['data']['spans']>[number];
type Props = SpanFilterControls & {
  span: Span;
  spans: Span[];
  focusRevision: number;
  onSelect: (id: string | undefined) => void;
  onClose: () => void;
  onOpenLogs?: (() => void) | undefined;
  logsDisabled?: boolean | undefined;
};

export function InvestigationSpanInspector(props: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const index = props.spans.findIndex(span => span.spanId === props.span.spanId);
  useEffect(() => {
    if (props.focusRevision && ref.current) focusTraceInspector(ref.current);
  }, [props.focusRevision]);
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={t('exploreInvestigation.trace.spanInspector')}
      className={styles.spanInspector}
      data-trace-inspector-focus
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          props.onClose();
        }
      }}
    >
      <InspectorHeader {...props} index={index} />
      <SpanTiming span={props.span} />
      <SpanEvidenceTabs {...props} />
    </aside>
  );
}

function SpanTiming({ span }: { span: Span }) {
  const { t } = useTranslation();
  const fraction = (BigInt(span.startTimeUnixNano) % 1_000_000_000n).toString().padStart(9, '0');
  const exactStart = new Date(span.startTime).toISOString().replace(/\.\d{3}Z$/, `.${fraction}Z`);
  return (
    <div className={styles.spanTiming}>
      <span>
        {t('exploreInvestigation.trace.duration')}:{' '}
        <span title={`${span.durationNanos} ns`}>
          {formatTraceDuration(investigationDurationNanoToMillis(span.durationNanos))}
        </span>
      </span>
      <span>
        <span>{t('exploreInvestigation.trace.startTime')}</span>:{' '}
        <time
          dateTime={exactStart}
          title={exactStart}
          aria-label={exactStart}
          data-start-time-unix-nano={span.startTimeUnixNano}
        >
          {formatShortLocalTime(span.startTime, { date: true, milliseconds: true })}
        </time>
      </span>
    </div>
  );
}

function SpanFields({ span }: { span: Span }) {
  const { t } = useTranslation();
  return (
    <div className={styles.selectedSpan}>
      <OtlpAttributeSection
        title={t('exploreInvestigation.trace.fields')}
        value={{
          [t('explore.serviceName')]: fieldValue(span.serviceName),
          [t('explore.spanId')]: fieldValue(span.spanId),
          [t('exploreInvestigation.trace.parentSpanId')]: fieldValue(span.parentSpanId),
          [t('exploreTrace.status')]: fieldValue(span.status),
          [t('exploreTrace.kind')]: fieldValue(span.spanKind),
          [t('exploreTrace.scope')]: fieldValue(span.scopeName)
        }}
      />
      {
        <>
          <OtlpAttributeSection title={t('exploreTrace.spanAttributes')} value={span.spanAttributes ?? undefined} />
          <OtlpAttributeSection
            title={t('exploreTrace.resourceAttributes')}
            value={span.resourceAttributes ?? undefined}
          />
          {span.events?.length ? (
            <OtlpAttributeSection title={t('exploreInvestigation.trace.events')} value={{ events: span.events }} />
          ) : null}
          {span.links?.length ? (
            <OtlpAttributeSection title={t('exploreInvestigation.trace.links')} value={{ links: span.links }} />
          ) : null}
        </>
      }
    </div>
  );
}

function fieldValue(value: string | null | undefined) {
  return value ?? '—';
}

function InspectorHeader(props: Props & { index: number }) {
  const { t } = useTranslation();
  return (
    <header className={styles.inspectorHeader}>
      <strong title={props.span.spanName ?? undefined}>
        {props.span.spanName ?? t('explore.perses.traceTable.unnamedSpan')}
      </strong>
      <div>
        {props.onOpenLogs && (
          <Button disabled={props.logsDisabled ?? false} onClick={props.onOpenLogs}>
            {t('explore.relatedLogs')}
          </Button>
        )}
        <Button
          disabled={props.index <= 0}
          onClick={() => props.onSelect(props.spans[props.index - 1]?.spanId)}
          aria-label={t('exploreInvestigation.trace.previousSpan')}
          icon={<LeftOutlined />}
        />
        <Button
          disabled={props.index >= props.spans.length - 1}
          onClick={() => props.onSelect(props.spans[props.index + 1]?.spanId)}
          aria-label={t('exploreInvestigation.trace.nextSpan')}
          icon={<RightOutlined />}
        />
        <Button
          onClick={props.onClose}
          aria-label={t('exploreInvestigation.trace.closeInspector')}
          icon={<CloseOutlined />}
        />
      </div>
    </header>
  );
}

export function SpanAttributeDetails({ span }: { span: Span }) {
  const { t } = useTranslation();
  const [json, setJson] = useState(false);
  const serialized = JSON.stringify(span, null, 2);
  const copy = useEvidenceCopy(serialized);
  return (
    <>
      <div className={styles.attributeActions}>
        <Button aria-pressed={json} onClick={() => setJson(value => !value)}>
          {json ? t('exploreInvestigation.trace.fields') : 'JSON'}
        </Button>
        <Button
          onClick={() => void copy.copy()}
          aria-label={t('exploreInvestigation.trace.copySpan')}
          icon={<CopyOutlined />}
        />
        <span role="status" aria-live="polite">
          {copy.status === 'idle'
            ? ''
            : t(
                copy.status === 'copied'
                  ? 'exploreInvestigation.trace.copySuccess'
                  : 'exploreInvestigation.trace.copyFailed'
              )}
        </span>
      </div>
      {json ? <pre className={styles.spanJson}>{serialized}</pre> : <SpanFields span={span} />}
    </>
  );
}
