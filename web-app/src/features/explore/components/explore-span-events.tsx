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

import { useTranslation } from 'react-i18next';
import type { HertzBeatTraceGanttQueryOutcome } from '@/platform/perses';
import { formatShortLocalTime } from '@/shared/time';
import styles from './explore-span-events.module.css';

type Span = NonNullable<Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>['data']['spans']>[number];
export function SpanEvents({ events }: { events: Span['events'] }) {
  const { t } = useTranslation();
  if (!events?.length) return <p role="status">{t('exploreInvestigation.trace.eventDetails.empty')}</p>;
  return (
    <ol className={styles.events}>
      {events.map((event, index) => {
        const nanos = BigInt(event.timeUnixNano);
        const millis = Number(nanos / 1_000_000n);
        const exact = new Date(millis)
          .toISOString()
          .replace(/\.\d{3}Z$/, `.${(nanos % 1_000_000_000n).toString().padStart(9, '0')}Z`);
        return (
          <li key={index}>
            <details open={index === 0}>
              <summary>
                <strong>{event.name || t('exploreInvestigation.trace.eventDetails.unnamed')}</strong>
                <time dateTime={exact} title={exact} data-time-unix-nano={event.timeUnixNano}>
                  {formatShortLocalTime(millis, { date: true, milliseconds: true })}
                </time>
              </summary>
              <dl>
                {Object.entries(event.attributes).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {!!event.droppedAttributesCount && (
                <p role="status">
                  {t('exploreInvestigation.trace.eventDetails.dropped', { count: event.droppedAttributesCount })}
                </p>
              )}
            </details>
          </li>
        );
      })}
    </ol>
  );
}
