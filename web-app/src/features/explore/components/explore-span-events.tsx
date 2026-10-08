/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
