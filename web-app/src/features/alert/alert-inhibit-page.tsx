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

import { Alert, Button, Empty, Input, Modal, Popconfirm, Select, Skeleton, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { alertInhibitPageSizes, type AlertInhibit, type AlertInhibitDraft } from './alert-inhibit-model';
import { AlertManagementNav } from './alert-management-nav';
import { AlertNoiseControlNav } from './alert-noise-control-nav';
import styles from './alert-policy-page.module.css';
import {
  useAlertInhibitController, type AlertInhibitDetailState, type AlertInhibitFailure, type AlertInhibitListState
} from './controller/use-alert-inhibit-controller';

const commonLabels = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

function AlertInhibitEditor({ draft, saving, failure, update, close, submit }: {
  draft: AlertInhibitDraft;
  saving: boolean;
  failure: AlertInhibitFailure | undefined;
  update: (patch: Partial<AlertInhibitDraft>) => void;
  close: () => void;
  submit: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <Modal open maskClosable={false} title={t(draft.id ? 'alertInhibits.edit' : 'alertInhibits.new')}
      okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving}
      onCancel={close} onOk={() => { void submit(); }}>
      {failure && <Alert type="error" showIcon
        message={failure === 'unavailable' ? t('common.unavailable') : t('alertInhibits.saveFailed')} />}
      <div className={styles.form}>
        <label className={styles.wide}>{t('alertInhibits.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.wide}>{t('alertInhibits.sourceLabels')}
          <Input.TextArea rows={2} value={draft.sourceLabelsText} placeholder={t('alertInhibits.matcherPlaceholder')}
            onChange={event => update({ sourceLabelsText: event.target.value })} />
          <span className={styles.hint}>{t('alertInhibits.sourceHelp')}</span>
        </label>
        <label className={styles.wide}>{t('alertInhibits.targetLabels')}
          <Input.TextArea rows={2} value={draft.targetLabelsText} placeholder={t('alertInhibits.matcherPlaceholder')}
            onChange={event => update({ targetLabelsText: event.target.value })} />
          <span className={styles.hint}>{t('alertInhibits.targetHelp')}</span>
        </label>
        <label className={styles.wide}>{t('alertInhibits.equalLabels')}
          <Select mode="tags" maxCount={10} value={draft.equalLabels} tokenSeparators={[',']}
            options={commonLabels.map(value => ({ value, label: value }))}
            onChange={equalLabels => update({ equalLabels })} />
          <span className={styles.hint}>{t('alertInhibits.equalHelp')}</span>
        </label>
        <label>{t('alertInhibits.enabled')}
          <Switch checked={draft.enable} onChange={enable => update({ enable })} />
        </label>
      </div>
    </Modal>
  );
}

function labelMap(labels: Record<string, string> | null) {
  if (labels === null || Object.keys(labels).length === 0) return '—';
  return <div className={styles.labels}>{Object.entries(labels).map(([key, value]) => <Tag key={key}>{key}:{value}</Tag>)}</div>;
}

function labelList(labels: string[] | null) {
  if (labels === null || labels.length === 0) return '—';
  return <div className={styles.labels}>{labels.map(label => <Tag key={label}>{label}</Tag>)}</div>;
}

function buildColumns(t: TFunction, busy: boolean, edit: (id: number) => unknown,
  toggle: (inhibit: AlertInhibit, enabled: boolean) => unknown,
  remove: (id: number) => unknown): ColumnsType<AlertInhibit> {
  return [
    { title: t('alertInhibits.name'), dataIndex: 'name', width: 210 },
    { title: t('alertInhibits.sourceLabels'), dataIndex: 'sourceLabels', render: labelMap },
    { title: t('alertInhibits.targetLabels'), dataIndex: 'targetLabels', render: labelMap },
    { title: t('alertInhibits.equalLabels'), dataIndex: 'equalLabels', render: labelList },
    { title: t('alertInhibits.enabled'), dataIndex: 'enable', width: 90, render: (value: boolean | null, inhibit) => (
      <Switch checked={value === true} disabled={busy || value === null}
        onChange={enabled => { void toggle(inhibit, enabled); }} />
    ) },
    { title: t('alertInhibits.updated'), width: 180,
      render: (_value, inhibit) => inhibit.gmtUpdate ?? inhibit.gmtCreate ?? '—' },
    { title: t('common.actions'), width: 150, render: (_value, inhibit) => (
      <Space>
        <Button type="link" disabled={busy} onClick={() => { void edit(inhibit.id); }}>{t('common.edit')}</Button>
        <Popconfirm title={t('alertInhibits.deleteConfirm')} onConfirm={() => remove(inhibit.id)}>
          <Button type="link" danger disabled={busy}>{t('alertInhibits.delete')}</Button>
        </Popconfirm>
      </Space>
    ) }
  ];
}

function InhibitResults({ state, columns, pageIndex, pageSize, changePage, retry }: {
  state: AlertInhibitListState;
  columns: ColumnsType<AlertInhibit>;
  pageIndex: number;
  pageSize: number;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') return <Failure message={t('common.unavailable')} retry={retry} />;
  if (state.kind === 'error') return <Failure message={t('common.routeError.description')} retry={retry} />;
  if (state.kind === 'empty') return <Empty description={t('alertInhibits.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  const total = state.kind === 'ready' ? state.total : 0;
  return <Table<AlertInhibit> rowKey="id" size="small" loading={state.kind === 'loading'} dataSource={records}
    columns={columns} scroll={{ x: 1200 }} pagination={{ current: pageIndex + 1, pageSize,
      pageSizeOptions: [...alertInhibitPageSizes], showSizeChanger: true, total, onChange: changePage }} />;
}

function DetailFailure({ state, retry }: { state: AlertInhibitDetailState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') return <Skeleton active paragraph={false} />;
  const message = state.kind === 'missing' ? t('common.notFound.description')
    : state.kind === 'unavailable' ? t('common.unavailable') : t('alertInhibits.loadFailed');
  return <Failure message={message} retry={retry} />;
}

function Failure({ message, retry }: { message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return <Alert type="error" showIcon message={message}
    action={<Button size="small" onClick={() => { void retry(); }}>{t('common.retry')}</Button>} />;
}

export function AlertInhibitPage() {
  const { t } = useTranslation();
  const controller = useAlertInhibitController();
  const { command, detail, draft, editorFailure, list, query, refreshing, search } = controller.state;
  const busy = command !== 'idle';
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><Typography.Title level={2}>{t('alertInhibits.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertInhibits.description')}</Typography.Text></div>
        <Button type="primary" disabled={busy} onClick={controller.create}>{t('alertInhibits.new')}</Button>
      </header>
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <div className={styles.toolbar}>
        <Input allowClear value={search} placeholder={t('alertInhibits.search')}
          onChange={event => controller.setSearch(event.target.value)} onPressEnter={controller.submitSearch} />
        <Button type="primary" onClick={controller.submitSearch}>{t('common.query')}</Button>
        <Button loading={refreshing} onClick={() => { void controller.refresh(); }}>{t('common.refresh')}</Button>
      </div>
      <DetailFailure state={detail} retry={controller.retryDetail} />
      <InhibitResults state={list} columns={buildColumns(t, busy, controller.edit, controller.toggle, controller.remove)}
        pageIndex={query.pageIndex} pageSize={query.pageSize} changePage={controller.changePage} retry={controller.refresh} />
      {draft && <AlertInhibitEditor draft={draft} saving={command === 'saving'} failure={editorFailure}
        update={controller.updateDraft} close={controller.closeDraft} submit={controller.submit} />}
    </div>
  );
}
