/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { HertzBeatDashboardDocument } from '@/platform/perses';
import { dashboardPanelKinds, newDashboardPanel } from '../model/signal-dashboard-panels';
import { DashboardMetricViewEditor } from './dashboard-metric-view-editor';
import { DashboardCompositionEditor } from './signal-dashboard-composition-editor';
import { DashboardLogAnalysisSummary } from './dashboard-log-analysis-summary';
import { MetricFields, QueryFields } from './signal-dashboard-query-fields';
import styles from './signal-dashboard.module.css';

type Props = {
  document: HertzBeatDashboardDocument;
  panelId: string;
  update: (document: HertzBeatDashboardDocument) => void;
  disabled: boolean;
};
export function SignalDashboardPanelEditor({ document, panelId, update, disabled }: Props) {
  const { t } = useTranslation();
  const panel = document.spec.panels[panelId]!;
  const query = panel.spec.queries[0].spec.plugin.spec.query;
  const change = (patch: Record<string, unknown>, section?: 'metric' | 'context') => {
    const next = structuredClone(document);
    const definition = next.spec.panels[panelId]!.spec.queries[0].spec.plugin.spec;
    const object = definition.query as unknown as Record<string, unknown>;
    const target = section ? { ...(object[section] as Record<string, unknown> | undefined) } : object;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') delete target[key];
      else target[key] = value;
    }
    if (section) object[section] = target;
    update(next);
  };
  return (
    <section className={styles.fields}>
      <h3>{t('signalDashboard.panelDefinition')}</h3>
      <label>
        {t('signalDashboard.panelTitle')}
        <Input
          aria-label={t('signalDashboard.panelTitle')}
          value={panel.spec.display.name}
          maxLength={255}
          onChange={event => {
            const next = structuredClone(document);
            next.spec.panels[panelId]!.spec.display.name = event.target.value;
            update(next);
          }}
        />
      </label>
      <label>
        {t('signalDashboard.panelType')}
        <Select
          disabled={disabled || query.queryKind === 'analysis'}
          value={panel.spec.plugin.kind}
          options={panelTypeOptions(panel, t)}
          onChange={kind => {
            const next = structuredClone(document);
            const replacement = newDashboardPanel(kind, panel.spec.display.name, query.context);
            if (query.signal === 'metrics' && ['TimeSeriesChart', 'StatChart', 'GaugeChart', 'Table'].includes(kind)) {
              replacement.spec.queries[0] = structuredClone(panel.spec.queries[0]);
            }
            next.spec.panels[panelId] = replacement;
            update(next);
          }}
        />
      </label>
      {query.signal === 'logs' && query.queryKind === 'analysis' ? (
        <DashboardLogAnalysisSummary analysis={query.analysis} />
      ) : query.signal === 'metrics' && query.queryKind === 'composition' ? (
        <CompositionFields document={document} panelId={panelId} update={update} disabled={disabled} change={change} />
      ) : query.signal === 'metrics' ? (
        <>
          <MetricFields metric={query.metric} change={patch => change(patch, 'metric')} disabled={disabled} />
        </>
      ) : (
        <QueryFields query={query} change={change} disabled={disabled} />
      )}
      {panel.spec.plugin.kind === 'GaugeChart' && (
        <label>
          {t('signalDashboard.gaugeMaximum')}
          <InputNumber
            aria-label={t('signalDashboard.gaugeMaximum')}
            disabled={disabled}
            min={Number.MIN_VALUE}
            value={panel.spec.plugin.spec.max}
            onChange={value => {
              const next = structuredClone(document);
              const plugin = next.spec.panels[panelId]!.spec.plugin;
              if (plugin.kind === 'GaugeChart') plugin.spec.max = value ?? 0;
              update(next);
            }}
          />
        </label>
      )}
      <PanelContextFields query={query} change={change} />
    </section>
  );
}

function PanelContextFields({
  query,
  change
}: {
  query: HertzBeatDashboardDocument['spec']['panels'][string]['spec']['queries'][0]['spec']['plugin']['spec']['query'];
  change: (patch: Record<string, unknown>, section?: 'metric' | 'context') => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {' '}
      {query.queryKind !== 'gantt' && (
        <>
          {query.queryKind !== 'analysis' && (
            <label>
              {t('signalDashboard.fields.limit')}
              <InputNumber
                aria-label={t('signalDashboard.fields.limit')}
                value={query.limit ?? null}
                min={1}
                max={query.signal === 'metrics' ? 32 : 1000}
                onChange={value => change({ limit: value ?? undefined })}
              />
            </label>
          )}
          <details>
            <summary>{t('signalDashboard.queryContext')}</summary>
            <div className={styles.fields}>
              {(
                [
                  'serviceName',
                  'serviceNamespace',
                  'environment',
                  'entityId',
                  'entityType',
                  'collectorId',
                  'instance',
                  'endpoint'
                ] as const
              ).map(field => (
                <label key={field}>
                  {t('signalDashboard.fields.' + field)}
                  <Input
                    aria-label={t('signalDashboard.queryContextField', { field: t('signalDashboard.fields.' + field) })}
                    value={query.context?.[field] ?? ''}
                    onChange={event => change({ [field]: event.target.value }, 'context')}
                  />
                </label>
              ))}
            </div>
          </details>
        </>
      )}
    </>
  );
}

function CompositionFields({
  document,
  panelId,
  update,
  disabled,
  change
}: Props & { change: (patch: Record<string, unknown>) => void }) {
  const { t } = useTranslation();
  const panel = document.spec.panels[panelId]!;
  const query = panel.spec.queries[0].spec.plugin.spec.query;
  if (query.signal !== 'metrics' || query.queryKind !== 'composition') return null;
  return (
    <>
      <DashboardCompositionEditor plan={query.plan} onChange={plan => change({ plan })} disabled={disabled} />
      <label>
        {t('signalDashboard.fields.operationName')}
        <Input
          disabled={disabled}
          aria-label={t('signalDashboard.fields.operationName')}
          value={query.operationName ?? ''}
          onChange={event => change({ operationName: event.target.value })}
        />
      </label>
      {panel.spec.plugin.kind === 'TimeSeriesChart' && (
        <DashboardMetricViewEditor
          plan={query.plan}
          view={panel.spec.plugin.spec.metricView ?? { mode: 'chart', hidden: [] }}
          disabled={disabled}
          onChange={metricView => {
            const next = structuredClone(document);
            const plugin = next.spec.panels[panelId]!.spec.plugin;
            if (plugin.kind === 'TimeSeriesChart') plugin.spec.metricView = metricView;
            update(next);
          }}
        />
      )}
    </>
  );
}

function panelTypeOptions(panel: HertzBeatDashboardDocument['spec']['panels'][string], t: TFunction) {
  const query = panel.spec.queries[0].spec.plugin.spec.query;
  return query.queryKind === 'analysis'
    ? [{ value: panel.spec.plugin.kind, label: t('explore.logAnalysis.' + query.analysis.representation) }]
    : dashboardPanelKinds.map(value => ({ value, label: t('signalDashboard.kinds.' + value) }));
}
