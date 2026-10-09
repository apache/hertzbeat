/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Checkbox, Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';
export function MetricFields({
  metric,
  change,
  disabled
}: {
  metric: Record<string, unknown>;
  change: (patch: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      {['name', 'operationName'].map(field => (
        <label key={field}>
          {t('signalDashboard.fields.' + field)}
          <Input
            aria-label={t('signalDashboard.fields.' + field)}
            value={typeof metric[field] === 'string' ? metric[field] : ''}
            onChange={event => change({ [field]: event.target.value })}
          />
        </label>
      ))}
      {Object.entries({
        aggregation: ['avg', 'sum', 'min', 'max', 'count'],
        temporalAggregation: ['raw', 'rate', 'increase', 'delta']
      }).map(([field, values]) => (
        <label key={field}>
          {t('signalDashboard.fields.' + field)}
          <Select
            disabled={disabled}
            allowClear
            value={metric[field] as string | undefined}
            options={values.map(value => ({ value, label: value }))}
            onChange={value => change({ [field]: value })}
          />
        </label>
      ))}
      <label>
        {t('signalDashboard.fields.stepSeconds')}
        <InputNumber
          value={(metric.stepSeconds as number | undefined) ?? null}
          min={1}
          max={86400}
          onChange={value => change({ stepSeconds: value ?? undefined })}
        />
      </label>
    </>
  );
}

export function QueryFields({
  query,
  change,
  disabled
}: {
  query: Record<string, unknown>;
  change: (patch: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const texts =
    query.signal === 'logs'
      ? ['search', 'traceId', 'spanId']
      : query.queryKind === 'gantt'
        ? ['traceId', 'spanId']
        : ['operationName'];
  const flags =
    query.signal === 'logs'
      ? ['hideInternal', 'hideNoise']
      : query.queryKind === 'gantt'
        ? []
        : ['errorOnly', 'hideInternal'];
  return (
    <>
      {texts.map(field => (
        <label key={field}>
          {t('signalDashboard.fields.' + field)}
          <Input
            aria-label={t('signalDashboard.fields.' + field)}
            value={typeof query[field] === 'string' ? query[field] : ''}
            onChange={event => change({ [field]: event.target.value })}
          />
        </label>
      ))}
      {query.signal === 'logs' && (
        <label>
          {t('signalDashboard.fields.severity')}
          <Select
            disabled={disabled}
            allowClear
            value={query.severity as string | undefined}
            options={['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].map(value => ({ value, label: value }))}
            onChange={value => change({ severity: value })}
          />
        </label>
      )}
      <TraceFilters query={query} change={change} disabled={disabled} />
      {flags.map(field => (
        <Checkbox
          key={field}
          disabled={disabled}
          checked={query[field] === true}
          onChange={event => change({ [field]: event.target.checked })}
        >
          {t('signalDashboard.fields.' + field)}
        </Checkbox>
      ))}
    </>
  );
}

function TraceFilters({
  query,
  change,
  disabled
}: {
  query: Record<string, unknown>;
  change: (patch: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      {' '}
      {query.signal === 'traces' && query.queryKind === 'table' && (
        <>
          <label>
            {t('signalDashboard.fields.spanScope')}
            <Select
              disabled={disabled}
              allowClear
              value={query.spanScope as string | undefined}
              options={['root', 'entrypoint'].map(value => ({ value, label: value }))}
              onChange={value => change({ spanScope: value })}
            />
          </label>
          {['minDurationMs', 'maxDurationMs'].map(field => (
            <label key={field}>
              {t('signalDashboard.fields.' + field)}
              <InputNumber
                value={(query[field] as number | undefined) ?? null}
                min={0}
                onChange={value => change({ [field]: value ?? undefined })}
              />
            </label>
          ))}
        </>
      )}
    </>
  );
}
