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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { HertzBeatTraceGanttQueryOutcome } from '@/platform/perses';
import { investigationDurationNanoToMillis } from '../model/explore-investigation-model';
import { formatTraceDuration } from './trace-display';
import styles from './explore-span-relationships.module.css';

type Span = NonNullable<Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>['data']['spans']>[number];
type Props = { span: Span; spans: Span[]; onSelect: (id: string | undefined) => void; disabled?: boolean | undefined };
const prefix = 'exploreInvestigation.trace.relationships.';

export function SpanRelationships({ span, spans, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  const parent = spans.find(item => item.traceId === span.traceId && item.spanId === span.parentSpanId);
  const children = spans.filter(
    item => item.traceId === span.traceId && item.parentSpanId === span.spanId && item.spanId !== span.spanId
  );
  return (
    <div className={styles.relationships}>
      <section aria-label={t(`${prefix}parent`)}>
        <h4>{t(`${prefix}parent`)}</h4>
        {parent ? (
          <SpanTarget span={parent} onSelect={onSelect} disabled={disabled} />
        ) : span.parentSpanId ? (
          <>
            <code>{span.parentSpanId}</code>
            <p className={styles.hint}>{t(`${prefix}missingParent`)}</p>
          </>
        ) : (
          <p className={styles.hint}>{t(`${prefix}noParent`)}</p>
        )}
      </section>
      <section aria-label={t(`${prefix}children`, { count: children.length })}>
        <h4>{t(`${prefix}children`, { count: children.length })}</h4>
        {children.length ? (
          <ul className={styles.list}>
            {children.map(child => (
              <li key={child.spanId}>
                <SpanTarget span={child} onSelect={onSelect} disabled={disabled} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>{t(`${prefix}noChildren`)}</p>
        )}
      </section>
      <SpanLinks span={span} spans={spans} onSelect={onSelect} disabled={disabled} />
    </div>
  );
}

function SpanTarget({ span, onSelect, disabled = false }: Pick<Props, 'span' | 'onSelect' | 'disabled'>) {
  return (
    <Button
      data-span-trigger={span.spanId}
      type="link"
      className={styles.target ?? ''}
      disabled={disabled}
      onClick={() => onSelect(span.spanId)}
    >
      <span className={styles.operation}>{span.spanName || span.spanId}</span>
      <span className={styles.service}>{span.serviceName || '—'}</span>
      <span className={styles.duration}>
        {formatTraceDuration(investigationDurationNanoToMillis(span.durationNanos))}
      </span>
    </Button>
  );
}
function LinkDetails({ link }: { link: Span['links'][number] }) {
  const { t } = useTranslation();
  const attributes = Object.entries(link.attributes);
  if (!attributes.length && !link.traceState && link.droppedAttributesCount == null) return null;
  return (
    <details className={styles.details}>
      <summary>{t(`${prefix}details`)}</summary>
      <dl className={styles.metadata}>
        {link.traceState && (
          <div>
            <dt>{t(`${prefix}traceState`)}</dt>
            <dd>{link.traceState}</dd>
          </div>
        )}
        {link.droppedAttributesCount != null && (
          <div>
            <dt>{t(`${prefix}droppedAttributes`)}</dt>
            <dd>{link.droppedAttributesCount}</dd>
          </div>
        )}
        {attributes.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function SpanLinks({ span, spans, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <section aria-label={t(`${prefix}links`, { count: span.links.length })}>
      <h4>{t(`${prefix}links`, { count: span.links.length })}</h4>
      <p className={styles.hint}>{t(`${prefix}linksHint`)}</p>
      {span.links.length ? (
        <ul className={styles.list}>
          {span.links.map((link, index) => {
            const target =
              link.traceId === span.traceId
                ? spans.find(item => item.traceId === span.traceId && item.spanId === link.spanId)
                : undefined;
            return (
              <li key={`${link.traceId}:${link.spanId}:${index}`}>
                {target ? (
                  <SpanTarget span={target} onSelect={onSelect} disabled={disabled} />
                ) : (
                  <p className={styles.hint}>{t(`${prefix}missingLink`)}</p>
                )}
                <dl className={styles.metadata}>
                  <div>
                    <dt>{t('explore.traceId')}</dt>
                    <dd>
                      <code>{link.traceId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>{t('explore.spanId')}</dt>
                    <dd>
                      <code>{link.spanId}</code>
                    </dd>
                  </div>
                </dl>
                <LinkDetails link={link} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.hint}>{t(`${prefix}noLinks`)}</p>
      )}
    </section>
  );
}
