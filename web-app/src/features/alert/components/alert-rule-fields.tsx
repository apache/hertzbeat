/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EyeOutlined, FileTextOutlined, LineChartOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Radio, Select, Switch, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import {
  alertRuleCustomLabels,
  alertRuleLabelValue,
  alertRuleModes,
  alertRuleSeverities,
  metricAlertFieldsForTarget,
  replaceAlertRuleCustomLabels,
  updateAlertRuleLabel,
  type AlertRuleDatasourceState,
  type AlertRuleDataType,
  type AlertRuleDraft,
  type InvalidAlertRuleDraftField
} from '../model/alert-rule-model';
import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import type { AlertRuleMetricTargetState } from '../model/alert-rule-metric-target-state';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleFieldLabel } from './alert-rule-field-label';
import { AlertRuleLabelSelector } from './alert-rule-label-selector';
import { AlertRuleMapField } from './alert-rule-map-field';
import { AlertRuleLogConditionEditor } from './alert-rule-log-condition-editor';
import { AlertRuleMetricBindingField, type MetricBindingViewState } from './alert-rule-metric-binding-field';
import { AlertRuleMetricTargetFields } from './alert-rule-metric-target-fields';
import { AlertRuleSqlEditor } from './alert-rule-sql-editor';
import { AlertRuleTemplateField } from './alert-rule-template-field';

type AlertRuleFieldsProps = {
  draft: AlertRuleDraft;
  busy: boolean;
  datasource: AlertRuleDatasourceState;
  invalidFields: InvalidAlertRuleDraftField[];
  preview: () => unknown;
  previewLoading: boolean;
  update: (patch: Partial<AlertRuleDraft>) => void;
  changeDataType: (dataType: AlertRuleDataType) => void;
  labelSuggestions: AlertLabelSuggestionState;
  metricTarget: AlertRuleMetricTargetState;
  metricBindings: MetricBindingViewState;
  changeMetricAuthoringMode: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeAuthoringMode'];
  changeMetricExpertCondition: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeExpertCondition'];
  changeMetricStructuredCondition: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeStructuredCondition'];
  changeMetricTarget: Parameters<typeof AlertRuleMetricTargetFields>[0]['changeTarget'];
  openMetricBindings: () => void;
  cancelMetricBindings: () => void;
  confirmMetricBindings: () => void;
  changeMetricBindingIds: (ids: number[]) => void;
  changeMetricBindingLabels: (labels: string[]) => void;
  retryMetricBindings: () => unknown;
  retryMetricTargetApps: () => unknown;
  retryMetricTargetHierarchy: () => unknown;
};

export function AlertRuleFields(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.form}>
      <FieldRow
        label={t('alertRules.name')}
        help={t('alertRules.help.name')}
        required
        invalid={hasInvalid(props, 'name')}
      >
        <Input
          aria-invalid={hasInvalid(props, 'name')}
          aria-label={t('alertRules.name')}
          disabled={props.busy}
          maxLength={100}
          required
          value={props.draft.name}
          onChange={event => props.update({ name: event.target.value })}
        />
      </FieldRow>
      {!props.draft.persisted && <SignalField {...props} />}
      <ConditionFields {...props} />
      <EvaluationFields {...props} />
      <NotificationFields {...props} />
      <FieldRow label={t('alertRules.enabledThreshold')} help={t('alertRules.help.enable')} required>
        <Switch
          aria-label={t('alertRules.enabledThreshold')}
          checked={props.draft.enable}
          disabled={props.busy}
          onChange={enable => props.update({ enable })}
        />
      </FieldRow>
    </div>
  );
}

function SignalField(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  const options: AlertRuleDataType[] =
    props.draft.kind === 'periodic' && props.draft.dataType === 'trace'
      ? ['metric', 'log', 'trace']
      : ['metric', 'log'];
  return (
    <FieldRow
      label={t('alertRules.dataType.label')}
      help={t('alertRules.help.dataType')}
      required
      invalid={hasInvalid(props, 'type')}
    >
      <Radio.Group
        aria-label={t('alertRules.dataType.label')}
        buttonStyle="solid"
        disabled={props.busy}
        optionType="button"
        value={props.draft.dataType}
        onChange={event => props.changeDataType(event.target.value as AlertRuleDataType)}
      >
        {options.map(dataType => (
          <Radio.Button key={dataType} value={dataType}>
            <span className={styles.dataTypeOption}>
              {dataTypeIcon(dataType)}
              <span>{t(`alertRules.dataType.${dataType}`)}</span>
            </span>
          </Radio.Button>
        ))}
      </Radio.Group>
    </FieldRow>
  );
}

function dataTypeIcon(dataType: AlertRuleDataType) {
  if (dataType === 'metric') return <LineChartOutlined aria-hidden="true" />;
  if (dataType === 'log') return <FileTextOutlined aria-hidden="true" />;
  return null;
}

function ConditionFields(props: AlertRuleFieldsProps) {
  if (props.draft.kind === 'realtime' && props.draft.dataType === 'metric') {
    return (
      <div className={styles.metricSection}>
        <AlertRuleMetricTargetFields
          busy={props.busy}
          draft={props.draft}
          state={props.metricTarget}
          update={props.update}
          changeAuthoringMode={props.changeMetricAuthoringMode}
          changeExpertCondition={props.changeMetricExpertCondition}
          changeStructuredCondition={props.changeMetricStructuredCondition}
          changeTarget={props.changeMetricTarget}
          retryApps={props.retryMetricTargetApps}
          retryHierarchy={props.retryMetricTargetHierarchy}
        />
        <AlertRuleMetricBindingField
          busy={props.busy}
          state={props.metricBindings}
          open={props.openMetricBindings}
          cancel={props.cancelMetricBindings}
          confirm={props.confirmMetricBindings}
          changeMonitorIds={props.changeMetricBindingIds}
          changeLabels={props.changeMetricBindingLabels}
          retry={props.retryMetricBindings}
        />
        <FinalExpressionField expression={props.draft.expr} />
      </div>
    );
  }
  if (props.draft.kind === 'realtime' && props.draft.dataType === 'log') {
    return (
      <>
        <AlertRuleLogConditionEditor
          busy={props.busy}
          expression={props.draft.expr}
          mode={props.draft.authoringMode ?? 'structured'}
          change={expr => props.update({ expr })}
          changeMode={(authoringMode, expr) => props.update({ authoringMode, expr })}
        />
        <FinalExpressionField expression={props.draft.expr} />
      </>
    );
  }
  return <QueryExpressionFields {...props} />;
}

function QueryExpressionFields(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  const periodic = props.draft.kind === 'periodic';
  const datasource = props.draft.dataType === 'metric' ? 'promql' : 'sql';
  return (
    <>
      {periodic && <PeriodicQueryLanguage busy={props.busy} dataType={props.draft.dataType} datasource={datasource} />}
      <FieldRow
        label={periodic ? '' : t('alertRules.expression')}
        required={!periodic}
        invalid={hasInvalid(props, 'expr')}
      >
        <div className={styles.queryEditor}>
          {periodic && props.draft.dataType === 'log' ? (
            <AlertRuleSqlEditor
              ariaLabel={t('alertRules.expression')}
              disabled={props.busy}
              invalid={hasInvalid(props, 'expr')}
              value={props.draft.expr}
              onChange={expr => props.update({ expr })}
            />
          ) : (
            <Input.TextArea
              aria-invalid={hasInvalid(props, 'expr')}
              aria-label={t('alertRules.expression')}
              disabled={props.busy}
              maxLength={periodic ? 100 : 2048}
              placeholder={periodic ? t('alertRules.query.promqlPlaceholder') : undefined}
              required
              rows={periodic ? 3 : 4}
              showCount={periodic ? { formatter: ({ count, maxLength }) => `${count}/${maxLength}` } : false}
              value={props.draft.expr}
              onChange={event => props.update({ expr: event.target.value })}
            />
          )}
          {periodic && (
            <Button
              icon={<EyeOutlined aria-hidden="true" />}
              type="primary"
              loading={props.previewLoading}
              disabled={props.busy}
              onClick={() => void props.preview()}
            >
              {t('alertRules.preview')}
            </Button>
          )}
        </div>
      </FieldRow>
      {!periodic && <FinalExpressionField expression={props.draft.expr} />}
    </>
  );
}

function PeriodicQueryLanguage({
  busy,
  dataType,
  datasource
}: {
  busy: boolean;
  dataType: AlertRuleDataType;
  datasource: 'promql' | 'sql';
}) {
  const { t } = useTranslation();
  return (
    <FieldRow
      label={t('alertRules.query.label')}
      help={t(dataType === 'log' ? 'alertRules.help.queryLog' : 'alertRules.help.queryMetric')}
      required
    >
      <div className={styles.queryLanguage}>
        <Radio.Group buttonStyle="solid" optionType="button" value={datasource} disabled={busy}>
          <Tooltip title={dataType === 'log' ? t('alertRules.query.promqlUnsupportedLog') : undefined}>
            <Radio.Button value="promql" disabled={dataType !== 'metric'}>
              {t('alertRules.query.promql')}
            </Radio.Button>
          </Tooltip>
          <Tooltip title={dataType === 'metric' ? t('alertRules.query.sqlUnsupportedMetric') : undefined}>
            <Radio.Button value="sql" disabled={dataType === 'metric'}>
              {t('alertRules.query.sql')}
            </Radio.Button>
          </Tooltip>
        </Radio.Group>
        <PeriodicQueryDescription datasource={datasource} />
      </div>
    </FieldRow>
  );
}

const periodicQueryExamples = {
  promql: [
    'cpu_usage > 80',
    'cpu_usage{instance="server1"} > 80',
    'rate(http_requests_total[5m]) > 100',
    'cpu > 80 and memory > 70'
  ],
  sql: [
    "SELECT COUNT(*) FROM hertzbeat_logs WHERE severity_text = 'ERROR'",
    'SELECT service_name, COUNT(*) FROM hertzbeat_logs GROUP BY service_name',
    "SELECT * FROM hertzbeat_logs WHERE time_unix_nano >= NOW() - INTERVAL '5 minute'"
  ]
} as const;

function PeriodicQueryDescription({ datasource }: { datasource: 'promql' | 'sql' }) {
  const { t } = useTranslation();
  return (
    <div className={styles.queryDescription} data-alert-rule-query-description={datasource}>
      <Typography.Text>{t(`alertRules.query.${datasource}Description`)}</Typography.Text>
      <span className={styles.queryExamplesTitle}>{t('alertRules.query.examples')}</span>
      <ul>
        {periodicQueryExamples[datasource].map(example => (
          <li key={example}>
            <code>{example}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinalExpressionField({ expression }: { expression: string }) {
  const { t } = useTranslation();
  return (
    <FieldRow label={t('alertRules.finalExpression')}>
      <output aria-label={t('alertRules.finalExpression')} className={styles.finalExpression} role="status">
        <pre>{expression}</pre>
      </output>
    </FieldRow>
  );
}

function EvaluationFields(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  const showPeriod = props.draft.kind === 'periodic' || props.draft.dataType === 'log';
  const periodLabel = props.draft.kind === 'periodic' ? 'alertRules.period' : 'alertRules.window';
  return (
    <>
      {showPeriod && (
        <FieldRow
          label={t(periodLabel)}
          help={t(props.draft.kind === 'periodic' ? 'alertRules.help.period' : 'alertRules.help.window')}
          required
          invalid={hasInvalid(props, 'period')}
        >
          <div className={styles.numberWithUnit}>
            <InputNumber
              aria-label={t(periodLabel)}
              disabled={props.busy}
              min={60}
              placeholder={t(
                props.draft.kind === 'periodic' ? 'alertRules.periodPlaceholder' : 'alertRules.windowPlaceholder'
              )}
              step={60}
              value={props.draft.period}
              onChange={period => props.update({ period })}
            />
            <span>{t('alertRules.seconds')}</span>
          </div>
        </FieldRow>
      )}
      <SeverityField {...props} />
      {props.draft.dataType === 'log' && <AlertModeField {...props} />}
      {!(props.draft.kind === 'periodic' && props.draft.dataType === 'log') && (
        <FieldRow
          label={t('alertRules.times')}
          help={t('alertRules.help.times')}
          required
          invalid={hasInvalid(props, 'times')}
        >
          <InputNumber
            aria-label={t('alertRules.times')}
            disabled={props.busy}
            min={1}
            max={999}
            value={props.draft.times}
            onChange={times => props.update({ times })}
          />
        </FieldRow>
      )}
    </>
  );
}

function SeverityField(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  return (
    <FieldRow
      label={t('alertRules.severity.label')}
      help={t('alertRules.help.severity')}
      required
      invalid={hasInvalid(props, 'severity')}
    >
      <Select
        aria-label={t('alertRules.severity.label')}
        aria-invalid={hasInvalid(props, 'severity')}
        aria-required="true"
        disabled={props.busy}
        placeholder={t('alertRules.severity.placeholder')}
        {...(hasInvalid(props, 'severity') ? { status: 'error' as const } : {})}
        value={alertRuleLabelValue(props.draft.labelsText, 'severity') || undefined}
        options={alertRuleSeverities.map(value => ({ value, label: t(`alert.severity.${value}`) }))}
        onChange={value =>
          props.update({ labelsText: updateAlertRuleLabel(props.draft.labelsText, 'severity', value ?? '') })
        }
      />
    </FieldRow>
  );
}

function AlertModeField(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  return (
    <FieldRow
      label={t('alertRules.mode.label')}
      help={t('alertRules.help.mode')}
      required
      invalid={hasInvalid(props, 'alertMode')}
    >
      <Select
        aria-label={t('alertRules.mode.label')}
        aria-invalid={hasInvalid(props, 'alertMode')}
        aria-required="true"
        disabled={props.busy}
        placeholder={t('alertRules.mode.placeholder')}
        {...(hasInvalid(props, 'alertMode') ? { status: 'error' as const } : {})}
        value={alertRuleLabelValue(props.draft.labelsText, 'alert_mode') || undefined}
        options={alertRuleModes.map(value => ({ value, label: t(`alertRules.mode.${value}`) }))}
        onChange={value =>
          props.update({ labelsText: updateAlertRuleLabel(props.draft.labelsText, 'alert_mode', value ?? '') })
        }
      />
    </FieldRow>
  );
}

function NotificationFields(props: AlertRuleFieldsProps) {
  const { t } = useTranslation();
  const rowCountLabel = t('alertRules.metricTarget.rowCount');
  const metricFields = selectedMetricTemplateFields(props.draft.metricEditor, props.metricTarget, rowCountLabel);
  return (
    <>
      <FieldRow
        label={t('alertRules.template')}
        help={t('alertRules.help.template')}
        required
        invalid={hasInvalid(props, 'template')}
      >
        <AlertRuleTemplateField
          draft={props.draft}
          busy={props.busy}
          invalid={hasInvalid(props, 'template')}
          metricFields={metricFields}
          update={props.update}
        />
      </FieldRow>
      <FieldRow label={t('alertRules.labels')} help={t('alertRules.help.labels')} invalid={hasInvalid(props, 'labels')}>
        <AlertRuleLabelSelector
          value={alertRuleCustomLabels(props.draft.labelsText)}
          busy={props.busy}
          suggestions={props.labelSuggestions}
          change={labels => props.update({ labelsText: replaceAlertRuleCustomLabels(props.draft.labelsText, labels) })}
        />
      </FieldRow>
      <FieldRow
        label={t('alertRules.annotations')}
        help={t('alertRules.help.annotations')}
        invalid={hasInvalid(props, 'annotations')}
      >
        <AlertRuleMapField
          value={props.draft.annotations ?? {}}
          busy={props.busy}
          addLabelKey="alertRules.map.addAnnotation"
          change={annotations => props.update({ annotations })}
        />
      </FieldRow>
    </>
  );
}

function selectedMetricTemplateFields(
  editor: AlertRuleDraft['metricEditor'],
  state: AlertRuleMetricTargetState,
  rowCountLabel: string
) {
  const target = editor?.kind === 'targeted' ? editor.target : null;
  if (target?.kind !== 'metric') return [];
  const hierarchy = templateHierarchyForApp(state, target.app);
  if (!hierarchy) return [];
  return metricAlertFieldsForTarget(hierarchy, target, rowCountLabel) ?? [];
}

function templateHierarchyForApp(state: AlertRuleMetricTargetState, app: string) {
  if (state.hierarchy.kind === 'ready' && state.hierarchy.hierarchy.value === app) {
    return state.hierarchy.hierarchy;
  }
  if (state.catalog?.kind === 'ready') {
    return state.catalog.hierarchies.find(candidate => candidate.value === app);
  }
  return undefined;
}

function FieldRow(props: { label: string; help?: string; required?: boolean; invalid?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={styles.fieldRow} data-invalid={props.invalid || undefined}>
      <AlertRuleFieldLabel
        className={styles.fieldLabel}
        colon={Boolean(props.label)}
        help={props.help}
        label={props.label}
        required={props.required}
      />
      <div className={`${styles.fieldControl} ${alignmentStyles.control}`}>
        {props.children}
        {props.invalid && <span className={styles.fieldError}>{t('alertRules.required')}</span>}
      </div>
    </div>
  );
}

function hasInvalid(props: AlertRuleFieldsProps, field: InvalidAlertRuleDraftField) {
  return props.invalidFields.includes(field);
}
