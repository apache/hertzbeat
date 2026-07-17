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

import { Alert, Button, Collapse, Input, InputNumber, Select, Spin, Switch } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { MonitorApp, MonitorCollector, MonitorParamDefine } from '../api/monitor-contract';
import { groupMonitorParamDefines, isMonitorParamVisible, monitorIntervalBounds,
  type MonitorEditorDraft, type MonitorParamFormValue } from '../model/monitor-editor-model';
import { monitorAppOptions } from '../model/monitor-model';
import { MonitorParamField } from './monitor-param-field';
import styles from './monitor-editor-form-view.module.css';

type Controller = {
  state: {
    evidence: { kind: 'loading' | 'missing' | 'unavailable' | 'error' | 'ready' };
    draft: MonitorEditorDraft | undefined;
    defines: MonitorParamDefine[];
    apps: MonitorApp[];
    collectors: MonitorCollector[];
    busy: boolean;
    command: 'idle' | 'detecting' | 'saving';
    validationIssues: string[];
    scrapeValues: readonly string[];
    sourceKey: string;
  };
  actions: {
    updateMonitor: (patch: Partial<MonitorEditorDraft['monitor']>) => void;
    updateCollector: (collector: string) => void;
    updateGrafana: (patch: Partial<MonitorEditorDraft['grafanaDashboard']>) => void;
    updateParam: (field: string, value: MonitorParamFormValue) => void;
    setParamValid: (field: string, valid: boolean) => void;
    changeSource: (next: { app?: string; scrape?: string }) => void;
    detect: () => Promise<void>;
    save: () => Promise<void>;
    cancel: () => void;
    retry: () => Promise<void>;
  };
};

export function MonitorEditorFormView({ mode, controller }: { mode: 'new' | 'edit'; controller: Controller }) {
  const { t } = useTranslation();
  const { evidence, draft, apps } = controller.state;
  if (evidence.kind === 'loading') return <Spin />;
  if (evidence.kind !== 'ready') {
    const key = evidence.kind === 'missing' ? 'common.notFound.description'
      : evidence.kind === 'unavailable' ? 'common.unavailable' : 'common.routeError.description';
    return <Alert type="error" showIcon message={t(key)} action={evidence.kind === 'missing'
      ? <Button onClick={controller.actions.cancel}>{t('common.back')}</Button>
      : <Button onClick={() => void controller.actions.retry()}>{t('common.retry')}</Button>} />;
  }
  if (!draft) {
    if (apps.length === 0) return <Alert type="warning" showIcon message={t('monitor.editor.appEmpty')} />;
    return <div className={styles.form}><label>{t('monitor.application')}<Select<string> showSearch
      options={monitorAppOptions(apps)}
      onChange={app => controller.actions.changeSource({ app, scrape: 'static' })} /></label></div>;
  }
  return <ReadyMonitorEditorForm mode={mode} controller={controller} draft={draft} />;
}

function ReadyMonitorEditorForm({ mode, controller, draft }: {
  mode: 'new' | 'edit'; controller: Controller; draft: MonitorEditorDraft;
}) {
  const { t, i18n } = useTranslation();
  const { defines, apps, collectors, busy, scrapeValues, validationIssues } = controller.state;
  const groups = groupMonitorParamDefines(defines);
  const labels = {
    add: t('monitor.editor.map.add'), remove: t('monitor.editor.map.remove'), key: t('monitor.editor.map.key'),
    value: t('monitor.editor.map.value'), emptyError: t('monitor.editor.map.empty'),
    duplicateError: t('monitor.editor.map.duplicate')
  };
  const metricsLabels = { ...labels, unit: t('monitor.editor.metrics.unit'), type: t('monitor.editor.metrics.type'),
    numberType: t('monitor.editor.metrics.number'), stringType: t('monitor.editor.metrics.string') };
  const paramContext = { draft, controller, validationIssues, language: i18n.language, labels, metricsLabels };
  return <>
    <ValidationSummary issues={validationIssues} defines={defines} language={i18n.language} />
    <div className={styles.form}>
      <label>{t('monitor.application')}<Select disabled={mode === 'edit'} showSearch optionFilterProp="label"
        value={draft.monitor.app || null} options={monitorAppOptions(apps)}
        onChange={app => controller.actions.changeSource({ app, scrape: 'static' })} /></label>
      <label>{t('monitor.editor.scrape')}<Select value={draft.monitor.scrape ?? 'static'}
        options={scrapeValues.map(value => ({ value, label: t(`monitor.editor.scrapeTypes.${value}`) }))}
        onChange={scrape => controller.actions.changeSource({ scrape })} /></label>
      <label>{t('monitor.name')}<Input status={validationIssues.includes('name') ? 'error' : ''} value={draft.monitor.name}
        onChange={event => controller.actions.updateMonitor({ name: event.target.value })} /></label>
      <label>{t('monitor.editor.collector')}<Select value={draft.collector}
        options={collectorOptions(collectors, draft.collector, t)} onChange={controller.actions.updateCollector} /></label>
      <ScheduleFields draft={draft} issues={validationIssues} update={controller.actions.updateMonitor} />
      {groups.basic.map(define => renderParamField(define, paramContext))}
      <AdvancedFields defines={groups.advanced} context={paramContext} />
      <div className={validationIssues.includes('param:__labels') ? styles.fieldError : styles.field}><MonitorParamField define={mapDefine('labels')} label={t('monitor.editor.labels')}
        value={draft.monitor.labels ?? null} onChange={value => controller.actions.updateMonitor({
          labels: mapValue(value) })} onValidityChange={valid => controller.actions.setParamValid('__labels', valid)}
        mapLabels={labels} metricsLabels={metricsLabels} /></div>
      <div className={validationIssues.includes('param:__annotations') ? styles.fieldError : styles.field}><MonitorParamField define={mapDefine('annotations')} label={t('monitor.editor.annotations')}
        value={draft.monitor.annotations ?? null} onChange={value => controller.actions.updateMonitor({
          annotations: mapValue(value) })} onValidityChange={valid => controller.actions.setParamValid('__annotations', valid)}
        mapLabels={labels} metricsLabels={metricsLabels} /></div>
      <label className={styles.wide}>{t('monitor.editor.descriptionLabel')}<Input.TextArea rows={3}
        value={draft.monitor.description ?? ''}
        onChange={event => controller.actions.updateMonitor({ description: event.target.value })} /></label>
      <GrafanaFields draft={draft} update={controller.actions.updateGrafana} />
    </div>
    <div className={styles.actions}>
      <Button disabled={busy} onClick={controller.actions.cancel}>{t('common.cancel')}</Button>
      <Button loading={controller.state.command === 'detecting'} disabled={busy && controller.state.command !== 'detecting'}
        onClick={() => void controller.actions.detect()}>{t('monitor.editor.detect')}</Button>
      <Button type="primary" loading={controller.state.command === 'saving'} disabled={busy && controller.state.command !== 'saving'}
        onClick={() => void controller.actions.save()}>{t('common.save')}</Button>
    </div>
  </>;
}

function mapDefine(field: string) {
  return { id: null, app: 'monitor', field, name: { 'en-US': field }, type: 'key-value', required: false,
    defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
    valueAlias: null, depend: null, hide: false };
}

function mapValue(value: MonitorParamFormValue) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

type ParamContext = {
  draft: MonitorEditorDraft;
  controller: Controller;
  validationIssues: string[];
  language: string;
  labels: RowEditorLabels;
  metricsLabels: ControllerLabels;
};
type RowEditorLabels = Parameters<typeof MonitorParamField>[0]['mapLabels'];
type ControllerLabels = Parameters<typeof MonitorParamField>[0]['metricsLabels'];

function renderParamField(define: MonitorParamDefine, context: ParamContext) {
  if (!isMonitorParamVisible(define, context.draft.params)) return null;
  const param = context.draft.params.find(item => item.field === define.field);
  if (!param) return null;
  return <div key={`${context.controller.state.sourceKey}:${define.field}`}
    aria-invalid={context.validationIssues.includes(`param:${define.field}`)}
    className={context.validationIssues.includes(`param:${define.field}`) ? styles.fieldError : styles.field}>
    <MonitorParamField define={define} value={param.paramValue}
      label={define.name[context.language] ?? define.name['en-US'] ?? define.field}
      onChange={value => context.controller.actions.updateParam(define.field, value)}
      onValidityChange={valid => context.controller.actions.setParamValid(define.field, valid)}
      mapLabels={context.labels} metricsLabels={context.metricsLabels} /></div>;
}

function ValidationSummary({ issues, defines, language }: {
  issues: string[]; defines: MonitorParamDefine[]; language: string;
}) {
  const { t } = useTranslation();
  if (issues.length === 0) return null;
  return <Alert type="error" showIcon message={t('monitor.editor.validation')}
    description={<ul>{issues.map(issue => <li key={issue}>{validationIssueLabel(issue, defines, language, t)}</li>)}</ul>} />;
}

function collectorOptions(collectors: MonitorCollector[], selected: string, t: TFunction) {
  const options = [{ value: '', label: t('monitor.editor.collectorDefault') }, ...collectors.map(item => ({
    value: item.name, label: item.online ? item.name : t('monitor.editor.collectorOffline', { name: item.name }),
    disabled: !item.online && item.name !== selected
  }))];
  if (selected && !collectors.some(item => item.name === selected)) {
    options.push({ value: selected, label: t('monitor.editor.collectorMissing', { name: selected }), disabled: true });
  }
  return options;
}

function ScheduleFields({ draft, issues, update }: {
  draft: MonitorEditorDraft; issues: string[]; update: Controller['actions']['updateMonitor'];
}) {
  const { t } = useTranslation();
  return <><label>{t('monitor.editor.schedule')}<Select value={draft.monitor.scheduleType ?? 'interval'}
    options={['interval', 'cron'].map(value => ({ value, label: t(`monitor.editor.scheduleTypes.${value}`) }))}
    onChange={scheduleType => update({ scheduleType, ...(scheduleType === 'interval' ? { cronExpression: null } : {}) })} /></label>
    {draft.monitor.scheduleType === 'cron' ? <label>{t('monitor.editor.cronExpression')}<Input
      status={issues.includes('cronExpression') ? 'error' : ''} value={draft.monitor.cronExpression ?? ''}
      onChange={event => update({ cronExpression: event.target.value })} /></label>
      : <label>{t('monitor.editor.interval')}<InputNumber status={issues.includes('intervals') ? 'error' : ''}
        {...monitorIntervalBounds(draft.monitor.app)} value={draft.monitor.intervals ?? 60}
        onChange={intervals => update({ intervals })} /></label>}</>;
}

function AdvancedFields({ defines, context }: { defines: MonitorParamDefine[]; context: ParamContext }) {
  const { t } = useTranslation();
  if (defines.length === 0) return null;
  return <Collapse className={styles.wide ?? ''} items={[{ key: 'advanced', label: t('monitor.editor.advanced'),
    children: <div className={styles.form}>{defines.map(define => renderParamField(define, context))}</div> }]} />;
}

function GrafanaFields({ draft, update }: {
  draft: MonitorEditorDraft; update: Controller['actions']['updateGrafana'];
}) {
  const { t } = useTranslation();
  if (draft.monitor.app !== 'prometheus') return null;
  return <><label>{t('monitor.editor.grafanaEnabled')}<Switch checked={draft.grafanaDashboard.enabled}
    onChange={enabled => update({ enabled })} /></label>
    {draft.grafanaDashboard.enabled && <label className={styles.wide}>{t('monitor.editor.grafanaTemplate')}
      <Input.TextArea rows={8} value={draft.grafanaDashboard.template ?? ''}
        onChange={event => update({ template: event.target.value })} /></label>}</>;
}

function validationIssueLabel(issue: string, defines: MonitorParamDefine[], language: string,
  translate: TFunction) {
  if (issue === 'app') return translate('monitor.application');
  if (issue === 'name') return translate('monitor.name');
  if (issue === 'intervals') return translate('monitor.editor.interval');
  if (issue === 'cronExpression') return translate('monitor.editor.cronExpression');
  if (issue === 'param:__labels') return translate('monitor.editor.labels');
  if (issue === 'param:__annotations') return translate('monitor.editor.annotations');
  const field = issue.startsWith('param:') ? issue.slice(6) : issue;
  const define = defines.find(item => item.field === field);
  return define?.name[language] ?? define?.name['en-US'] ?? field;
}
