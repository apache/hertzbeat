/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Input, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HertzBeatTraceGanttQueryOutcome } from '@/platform/perses';
import type { SpanFilterControls, SpanFilterTarget } from '../model/explore-span-filter';
import styles from './explore-span-fields.module.css';
type Span = NonNullable<Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>['data']['spans']>[number];
export function SpanSearchFields({ span, ...controls }: SpanFilterControls & { span: Span }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [json, setJson] = useState(false);
  const fields = spanFields(span);
  const matched = fields.filter(field =>
    `${field.key} ${JSON.stringify(field.value)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  return (
    <div className={styles.fields}>
      <div className={styles.tools}>
        <Input
          aria-label={t('exploreInvestigation.trace.searchFields')}
          placeholder={t('exploreInvestigation.trace.searchFields')}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <Button aria-pressed={json} onClick={() => setJson(!json)}>
          JSON
        </Button>
      </div>
      {controls.spanFilterPending && (
        <div role="status">
          {t('explore.perses.pendingFieldFilters')}{' '}
          {controls.onApplySpanFilters && <Button onClick={controls.onApplySpanFilters}>{t('common.query')}</Button>}
        </div>
      )}
      {json ? (
        <pre>{JSON.stringify(span, null, 2)}</pre>
      ) : (
        <dl>
          {matched.map(field => (
            <div key={field.key}>
              <dt>{field.key}</dt>
              <dd>
                <span>
                  {field.value == null
                    ? '—'
                    : typeof field.value === 'string'
                      ? field.value
                      : JSON.stringify(field.value)}
                </span>
                {'target' in field && field.target && <SpanFieldActions target={field.target} {...controls} />}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {!json && !matched.length && <p role="status">{t('explore.perses.noMatchingFields')}</p>}
    </div>
  );
}
function scalarTarget(scope: SpanFilterTarget['scope'], key: string, value: unknown): SpanFilterTarget | undefined {
  return typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
    ? { scope, key, value: String(value) }
    : undefined;
}
function SpanFieldActions({ target, ...controls }: SpanFilterControls & { target: SpanFilterTarget }) {
  const { t } = useTranslation();
  if (!controls.onAddSpanFilter) return null;
  return (
    <span className={styles.actions}>
      {(['=', '!='] as const).map(operator => {
        const reason = controls.spanFilterDisabledReason?.(target, operator);
        const label = t(operator === '=' ? 'explore.perses.includeField' : 'explore.perses.excludeField', {
          field: target.key
        });
        return (
          <Tooltip key={operator} title={reason} trigger={['hover', 'focus']}>
            <span tabIndex={reason ? 0 : undefined} role={reason ? 'group' : undefined} aria-description={reason}>
              <Button
                size="small"
                disabled={!!reason}
                aria-label={label}
                onClick={() => controls.onAddSpanFilter?.(target, operator)}
              >
                {operator === '=' ? '+' : '−'}
              </Button>
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}

function spanFields(span: Span) {
  return [
    { key: 'service', value: span.serviceName },
    { key: 'spanId', value: span.spanId },
    { key: 'parentSpanId', value: span.parentSpanId },
    { key: 'status', value: span.status },
    { key: 'kind', value: span.spanKind },
    ...Object.entries(span.spanAttributes ?? {}).map(([key, value]) => ({
      key: `attributes.${key}`,
      value,
      target: scalarTarget('attribute', key, value)
    })),
    ...Object.entries(span.resourceAttributes ?? {}).map(([key, value]) => ({
      key: `resource.${key}`,
      value,
      target: scalarTarget('resource', key, value)
    }))
  ];
}
