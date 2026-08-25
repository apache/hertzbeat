/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Cascader, Input, Tag } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildMetricAlertTargetCatalog,
  type AlertRuleDraft,
  type MetricAlertAuthoring,
  type MetricAlertConditionGroup,
  type MetricAlertTargetCatalog,
  type RealtimeMetricTarget
} from '../model/alert-rule-model';
import type { AlertRuleMetricTargetState } from '../model/alert-rule-metric-target-state';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleFieldLabel } from './alert-rule-field-label';
import { AlertRuleMetricTargetEvidence } from './alert-rule-metric-target-evidence';
import { AlertRuleMetricConditionEditor } from './alert-rule-metric-condition-editor';

const wideClassName = styles.wide ?? '';

type AlertRuleMetricTargetFieldsProps = {
  busy: boolean;
  draft: AlertRuleDraft;
  state: AlertRuleMetricTargetState;
  update: (patch: Partial<AlertRuleDraft>) => void;
  changeAuthoringMode: (mode: MetricAlertAuthoring['mode']) => void;
  changeExpertCondition: (condition: string) => void;
  changeStructuredCondition: (condition: MetricAlertConditionGroup) => void;
  changeTarget: (target: RealtimeMetricTarget) => void;
  retryApps: () => unknown;
  retryHierarchy: () => unknown;
};

type MetricTarget = Extract<RealtimeMetricTarget, { kind: 'metric' }>;

type TargetCascadeOption = {
  value: string;
  label: string;
  children?: TargetCascadeOption[];
  target?: RealtimeMetricTarget;
};

/** Renders the guided target boundary without rewriting unknown legacy expressions. */
export function AlertRuleMetricTargetFields(props: AlertRuleMetricTargetFieldsProps) {
  const { t } = useTranslation();
  const editor = props.draft.metricEditor;
  if (editor?.kind === 'unparsed') {
    return (
      <>
        <Alert
          className={wideClassName}
          type="warning"
          showIcon
          message={t('alertRules.metricTarget.legacyExpression')}
        />
        <ExpressionField {...props} />
      </>
    );
  }

  return <GuidedMetricTargetFields {...props} />;
}

function GuidedMetricTargetFields(props: AlertRuleMetricTargetFieldsProps) {
  const { t } = useTranslation();
  const editor = props.draft.metricEditor;
  const catalogs = useMemo(
    () => catalogsFromState(props.state.apps, props.state.catalog, props.state.hierarchy, t),
    [props.state.apps, props.state.catalog, props.state.hierarchy, t]
  );
  const selectedTarget = selectedTargetOption(editor, catalogs);
  const selectedPath = selectedTargetPath(selectedTarget);
  const options = useMemo(() => targetCascaderOptions(catalogs), [catalogs]);
  const selector = targetSelectorState(props.busy, props.state);
  return (
    <>
      <label>
        <AlertRuleFieldLabel
          className={styles.metricLabel}
          help={t('alertRules.help.target')}
          label={t('alertRules.metricTarget.type')}
          required
        />
        <Cascader<TargetCascadeOption>
          aria-label={t('alertRules.metricTarget.type')}
          aria-required="true"
          disabled={selector.disabled}
          loading={selector.loading}
          multiple={false}
          showSearch={{ filter: caseInsensitivePathFilter }}
          placeholder={t('alertRules.metricTarget.typePlaceholder')}
          {...(selectedPath ? { value: selectedPath } : {})}
          options={options}
          onChange={(_, selectedOptions) => {
            const option = selectedOptions.at(-1);
            if (option?.target) props.changeTarget(option.target);
          }}
        />
      </label>
      <AlertRuleMetricTargetEvidence
        state={props.state}
        catalog={selectedCatalog(editor, catalogs)}
        retryApps={props.retryApps}
        retryHierarchy={props.retryHierarchy}
      />
      {editor?.kind === 'targeted' && editor.target?.kind === 'availability' ? (
        <div className={styles.metricAvailabilityRow} role="note">
          <AlertRuleFieldLabel
            className={styles.metricLabel}
            help={t('alertRules.help.rule')}
            label={t('alertRules.metricCondition.rule')}
            required
          />
          <div className={styles.availabilityRule}>
            <Tag color="error" data-testid="availability-status">
              {t('alertRules.metricTarget.availabilityDown')}
            </Tag>
            <Tag color="error" data-testid="availability-status">
              {t('alertRules.metricTarget.availabilityUnreachable')}
            </Tag>
            <span>{t('alertRules.metricTarget.availabilityTrigger')}</span>
          </div>
        </div>
      ) : null}
      {selectedTarget?.target.kind === 'metric' && (
        <AlertRuleMetricConditionEditor
          busy={props.busy}
          draft={props.draft}
          fields={selectedTarget.fields}
          changeStructured={props.changeStructuredCondition}
          changeExpert={props.changeExpertCondition}
          changeMode={props.changeAuthoringMode}
        />
      )}
    </>
  );
}

function targetSelectorState(busy: boolean, state: AlertRuleMetricTargetState) {
  const catalogReady = state.catalog === undefined || state.catalog.kind === 'ready';
  return {
    disabled: busy || state.apps.kind !== 'ready' || !catalogReady,
    loading: state.apps.kind === 'loading' || state.catalog?.kind === 'loading'
  };
}

function selectedTargetOption(editor: AlertRuleDraft['metricEditor'], catalogs: MetricAlertTargetCatalog[]) {
  if (editor?.kind !== 'targeted' || !editor.target) return null;
  const selectedTarget = editor.target;
  return catalogs.flatMap(catalog => catalog.targets).find(option => sameTarget(option.target, selectedTarget)) ?? null;
}

function selectedTargetPath(option: ReturnType<typeof selectedTargetOption>) {
  return option ? [option.target.app, targetValue(option.target)] : undefined;
}

function selectedCatalog(editor: AlertRuleDraft['metricEditor'], catalogs: MetricAlertTargetCatalog[]) {
  if (editor?.kind !== 'targeted') return null;
  return catalogs.find(catalog => catalog.app.value === editor.app) ?? null;
}

function targetValue(target: RealtimeMetricTarget) {
  return target.kind === 'availability' ? `${target.app}:availability` : `${target.app}:metric:${target.metric}`;
}

function ExpressionField({ busy, draft, update }: AlertRuleMetricTargetFieldsProps) {
  const { t } = useTranslation();
  return (
    <label className={wideClassName}>
      <AlertRuleFieldLabel className={styles.metricLabel} label={t('alertRules.expression')} required />
      <Input.TextArea
        aria-label={t('alertRules.expression')}
        disabled={busy}
        required
        rows={5}
        value={draft.expr}
        onChange={event => update({ expr: event.target.value })}
      />
    </label>
  );
}

function targetCascaderOptions(catalogs: MetricAlertTargetCatalog[]): TargetCascadeOption[] {
  return catalogs.map(catalog => ({
    value: catalog.app.value,
    label: catalog.app.label,
    children: catalog.targets.map(option => ({
      value: targetValue(option.target),
      label: option.label,
      target: option.target
    }))
  }));
}

function caseInsensitivePathFilter(inputValue: string, path: TargetCascadeOption[]) {
  const needle = inputValue.toLocaleLowerCase();
  return path.some(option =>
    String(option.label ?? '')
      .toLocaleLowerCase()
      .includes(needle)
  );
}

function isMetricTarget(target: RealtimeMetricTarget): target is MetricTarget {
  return target.kind === 'metric';
}

function sameTarget(left: RealtimeMetricTarget, right: RealtimeMetricTarget) {
  if (left.kind !== right.kind || left.app !== right.app) return false;
  return !isMetricTarget(left) || (isMetricTarget(right) && left.metric === right.metric);
}

function catalogsFromState(
  apps: AlertRuleMetricTargetState['apps'],
  catalog: AlertRuleMetricTargetState['catalog'],
  hierarchy: AlertRuleMetricTargetState['hierarchy'],
  t: ReturnType<typeof useTranslation>['t']
): MetricAlertTargetCatalog[] {
  const hierarchies = hierarchyRoots(apps, catalog, hierarchy);
  return hierarchies.flatMap(hierarchy => {
    try {
      return [
        buildMetricAlertTargetCatalog(hierarchy, {
          availability: t('alertRules.metricTarget.availability'),
          rowCount: t('alertRules.metricTarget.rowCount')
        })
      ];
    } catch {
      return [];
    }
  });
}

function hierarchyRoots(
  apps: AlertRuleMetricTargetState['apps'],
  catalog: AlertRuleMetricTargetState['catalog'],
  hierarchy: AlertRuleMetricTargetState['hierarchy']
) {
  if (catalog?.kind === 'ready') {
    return catalog.hierarchies.filter(root => root.category !== '__system__');
  }
  if (hierarchy.kind === 'ready') return [hierarchy.hierarchy];
  if (apps.kind !== 'ready') return [];
  return apps.apps.map(app => ({
    category: app.category ?? null,
    value: app.value,
    label: app.label,
    isLeaf: false,
    hide: false,
    type: null,
    unit: null,
    children: []
  }));
}
