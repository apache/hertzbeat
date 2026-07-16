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

import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, App, Button, Input, InputNumber, Select, Spin, Switch, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { buildMonitorParams, buildMonitorPayload, validateMonitorDraft } from '../model/monitor-editor-model';
import {
  detectMonitor,
  loadMonitorApps,
  loadMonitorDetail,
  loadMonitorParamDefines,
  saveMonitor,
  type Monitor,
  type MonitorApp,
  type MonitorDetail,
  type MonitorParam,
  type MonitorParamDefine
} from '../api/monitor-api';
import { monitorAppOptions, safeMonitorReturnTo } from '../model/monitor-model';
import styles from './monitor-editor-page.module.css';

const emptyMonitor: Monitor = { id: 0, app: '', name: '', instance: '', status: 0, intervals: 60, scheduleType: 'interval', scrape: 'static' };

function activeMonitorApp(mode: 'new' | 'edit', detail: MonitorDetail | undefined, selectedApp: string) {
  return mode === 'edit' ? detail?.monitor.app ?? '' : selectedApp;
}

function initialMonitorDetail(detail: MonitorDetail | undefined, app: string): MonitorDetail {
  return detail ?? { monitor: { ...emptyMonitor, app }, params: [], collector: '' };
}

function editorTitleKey(mode: 'new' | 'edit') {
  return mode === 'new' ? 'monitor.editor.newTitle' : 'monitor.editor.editTitle';
}

function editorReady(mode: 'new' | 'edit', failed: boolean, appsPending: boolean, detailPending: boolean, activeApp: string, definesPending: boolean) {
  if (failed || appsPending) return false;
  if (mode === 'edit' && detailPending) return false;
  return !activeApp || !definesPending;
}

function EditorBody({ failed, ready, children }: { failed: boolean; ready: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  return <Spin spinning={!ready}>{ready ? children : null}</Spin>;
}

type MonitorParamInputProps = {
  define: MonitorParamDefine;
  param: MonitorParam | undefined;
  label: string;
  update: (value: unknown) => void;
};

function MonitorParamInput({ define, param, label, update }: MonitorParamInputProps) {
  const value = param?.paramValue;
  if (define.type === 'boolean') return <label>{label}<Switch checked={Boolean(value)} onChange={update} /></label>;
  if (define.type === 'number') return <label>{label}<InputNumber<number> value={typeof value === 'number' ? value : null} onChange={update} /></label>;
  return <label>{label}<Input value={typeof value === 'string' ? value : ''} onChange={event => update(event.target.value)} /></label>;
}

type MonitorEditorFormProps = {
  mode: 'new' | 'edit';
  initial: MonitorDetail;
  defines: MonitorParamDefine[];
  apps: MonitorApp[];
  changeApp: (app: string) => void;
  returnTo: string;
};

function MonitorEditorForm({ mode, initial, defines, apps, changeApp, returnTo }: MonitorEditorFormProps) {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState(initial.monitor);
  const [collector, setCollector] = useState(initial.collector ?? '');
  const [params, setParams] = useState(() => buildMonitorParams(defines, initial.params));
  const mutation = useMutation({
    mutationFn: ({ action, payload }: { action: 'detect' | 'save'; payload: unknown }) => (
      action === 'detect' ? detectMonitor(payload) : saveMonitor(mode, payload)
    )
  });
  const paramLabel = (name: string | Record<string, string> | undefined, field: string) => typeof name === 'string' ? name : name?.[i18n.language] ?? name?.['en-US'] ?? field;
  const updateParam = (field: string, value: unknown) => setParams(current => current.map(param => param.field === field ? { ...param, paramValue: value } : param));

  const submit = (action: 'detect' | 'save') => {
    if (validateMonitorDraft(monitor, defines, params).length > 0) {
      void message.warning(t('monitor.editor.validation'));
      return;
    }
    mutation.mutate({ action, payload: buildMonitorPayload(monitor, collector, params) }, {
      onSuccess: () => {
        void message.success(t(action === 'detect' ? 'monitor.editor.detectSuccess' : 'monitor.editor.saveSuccess'));
        if (action === 'save') {
          void navigate(mode === 'edit' ? returnTo : `/monitors?app=${encodeURIComponent(monitor.app)}`);
        }
      },
      onError: () => void message.error(t(action === 'detect' ? 'monitor.editor.detectFailed' : 'monitor.editor.saveFailed'))
    });
  };

  return <>
    <div className={styles.form}>
      <label>{t('monitor.application')}<Select<string>
        disabled={mode === 'edit'}
        showSearch
        optionFilterProp="label"
        value={monitor.app || null}
        options={monitorAppOptions(apps)}
        onChange={app => { setMonitor(current => ({ ...current, app })); changeApp(app); }}
      /></label>
      <label>{t('monitor.name')}<Input
        value={monitor.name}
        onChange={event => setMonitor(current => ({ ...current, name: event.target.value }))}
      /></label>
      <label>{t('monitor.editor.interval')}<InputNumber<number>
        min={10}
        value={monitor.intervals ?? 60}
        onChange={value => setMonitor(current => ({ ...current, intervals: value ?? 60 }))}
      /></label>
      <label>{t('monitor.editor.collector')}<Input
        value={collector}
        placeholder={t('monitor.editor.collectorDefault')}
        onChange={event => setCollector(event.target.value)}
      /></label>
      <label className={styles.wide}>{t('monitor.editor.descriptionLabel')}<Input.TextArea
        rows={2}
        value={monitor.description}
        onChange={event => setMonitor(current => ({ ...current, description: event.target.value }))}
      /></label>
      {defines.length > 0 && <Typography.Title className={styles.section ?? ''} level={4}>{t('monitor.editor.connection')}</Typography.Title>}
      {defines.filter(define => !define.hide).map(define => <MonitorParamInput
        key={define.field}
        define={define}
        param={params.find(param => param.field === define.field)}
        label={paramLabel(define.name, define.field)}
        update={value => updateParam(define.field, value)}
      />)}
    </div>
    <div className={styles.actions}>
      <Button onClick={() => void navigate(returnTo)}>{t('common.cancel')}</Button>
      <Button loading={mutation.isPending} onClick={() => submit('detect')}>{t('monitor.editor.detect')}</Button>
      <Button type="primary" loading={mutation.isPending} onClick={() => submit('save')}>{t('common.save')}</Button>
    </div>
  </>;
}

export function MonitorEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const { monitorId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = safeMonitorReturnTo(searchParams.get('returnTo'));
  const [selectedApp, setSelectedApp] = useState(searchParams.get('app') ?? '');
  const apps = useQuery({ queryKey: ['monitor-apps'], queryFn: loadMonitorApps });
  const detail = useQuery({
    queryKey: ['monitor-detail', monitorId],
    queryFn: () => loadMonitorDetail(monitorId),
    enabled: mode === 'edit' && Boolean(monitorId)
  });
  const activeApp = activeMonitorApp(mode, detail.data, selectedApp);
  const defines = useQuery({
    queryKey: ['monitor-param-defines', activeApp],
    queryFn: () => loadMonitorParamDefines(activeApp),
    enabled: Boolean(activeApp)
  });
  const initial = useMemo<MonitorDetail>(() => initialMonitorDetail(detail.data, activeApp), [activeApp, detail.data]);
  const failed = apps.isError || detail.isError || defines.isError;
  const ready = editorReady(mode, failed, apps.isPending, detail.isPending, activeApp, defines.isPending);

  return <div className={styles.page}>
    <header className={styles.heading}>
      <Typography.Title level={2}>{t(editorTitleKey(mode))}</Typography.Title>
      <Typography.Text type="secondary">{t('monitor.editor.description')}</Typography.Text>
    </header>
    <EditorBody failed={failed} ready={ready}>
      <MonitorEditorForm
        key={`${mode}:${monitorId}:${activeApp}`}
        mode={mode}
        initial={initial}
        defines={defines.data ?? []}
        apps={apps.data ?? []}
        changeApp={setSelectedApp}
        returnTo={returnTo}
      />
    </EditorBody>
  </div>;
}
