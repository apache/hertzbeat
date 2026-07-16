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

import { Alert, Button, Empty, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  alertGroupPageSizes,
  type AlertGroupConverge,
  type AlertGroupDraft
} from './alert-group-model';
import { AlertManagementNav } from './alert-management-nav';
import { AlertNoiseControlNav } from './alert-noise-control-nav';
import styles from './alert-policy-page.module.css';
import {
  useAlertGroupController,
  type AlertGroupDetailState,
  type AlertGroupFailure,
  type AlertGroupListState
} from './controller/use-alert-group-controller';

const commonGroupLabels = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

function AlertGroupEditor({ draft, saving, failure, update, close, submit }: {
  draft: AlertGroupDraft;
  saving: boolean;
  failure: AlertGroupFailure | undefined;
  update: (patch: Partial<AlertGroupDraft>) => void;
  close: () => void;
  submit: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <Modal open maskClosable={false} title={t(draft.id ? 'alertGroups.edit' : 'alertGroups.new')}
      okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving}
      onCancel={close} onOk={() => { void submit(); }}>
      {failure && <Alert type="error" showIcon message={failure === 'unavailable' ? t('common.unavailable') : t('alertGroups.saveFailed')} />}
      <div className={styles.form}>
        <label className={styles.wide}>{t('alertGroups.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.wide}>{t('alertGroups.labels')}
          <Select mode="tags" maxCount={10} value={draft.groupLabels} tokenSeparators={[',']}
            options={commonGroupLabels.map(value => ({ value, label: value }))}
            onChange={groupLabels => update({ groupLabels })} />
        </label>
        <label>{t('alertGroups.wait')}
          <InputNumber min={0} step={30} value={draft.groupWait} onChange={value => update({ groupWait: value ?? 30 })} />
        </label>
        <label>{t('alertGroups.interval')}
          <InputNumber min={0} step={300} value={draft.groupInterval} onChange={value => update({ groupInterval: value ?? 300 })} />
        </label>
        <label>{t('alertGroups.repeat')}
          <InputNumber min={0} step={3600} value={draft.repeatInterval} onChange={value => update({ repeatInterval: value ?? 14400 })} />
        </label>
        <label>{t('alertGroups.enabled')}
          <Switch checked={draft.enable} onChange={enable => update({ enable })} />
        </label>
      </div>
    </Modal>
  );
}

function buildColumns(t: TFunction, busy: boolean, edit: (id: number) => unknown,
  toggle: (group: AlertGroupConverge, enabled: boolean) => unknown,
  remove: (id: number) => unknown): ColumnsType<AlertGroupConverge> {
  const seconds = (value: number | null) => value === null ? '—' : t('alertGroups.seconds', { value });
  return [
    { title: t('alertGroups.name'), dataIndex: 'name' },
    { title: t('alertGroups.labels'), dataIndex: 'groupLabels', render: (labels: string[] | null) => (
      <div className={styles.labels}>{(labels ?? []).map(label => <Tag key={label}>{label}</Tag>)}</div>
    ) },
    { title: t('alertGroups.wait'), dataIndex: 'groupWait', width: 130, render: seconds },
    { title: t('alertGroups.interval'), dataIndex: 'groupInterval', width: 150, render: seconds },
    { title: t('alertGroups.repeat'), dataIndex: 'repeatInterval', width: 150, render: seconds },
    { title: t('alertGroups.enabled'), dataIndex: 'enable', width: 90, render: (value: boolean | null, group) => (
      <Switch checked={value === true} disabled={busy || value === null} onChange={enabled => { void toggle(group, enabled); }} />
    ) },
    { title: t('alertGroups.updated'), dataIndex: 'gmtUpdate', width: 180, render: (value: string | null) => value ?? '—' },
    { title: t('common.actions'), width: 150, render: (_value, group) => (
      <Space>
        <Button type="link" disabled={busy} onClick={() => { void edit(group.id); }}>{t('common.edit')}</Button>
        <Popconfirm title={t('alertGroups.deleteConfirm')} onConfirm={() => remove(group.id)}>
          <Button type="link" danger disabled={busy}>{t('alertGroups.delete')}</Button>
        </Popconfirm>
      </Space>
    ) }
  ];
}

function GroupResults({ state, columns, pageIndex, pageSize, changePage, retry }: {
  state: AlertGroupListState;
  columns: ColumnsType<AlertGroupConverge>;
  pageIndex: number;
  pageSize: number;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') return <Failure message={t('common.unavailable')} retry={retry} />;
  if (state.kind === 'error') return <Failure message={t('common.routeError.description')} retry={retry} />;
  if (state.kind === 'empty') return <Empty description={t('alertGroups.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  const total = state.kind === 'ready' ? state.total : 0;
  return <Table<AlertGroupConverge> rowKey="id" size="small" loading={state.kind === 'loading'} dataSource={records}
    columns={columns} scroll={{ x: 1100 }} pagination={{ current: pageIndex + 1, pageSize,
      pageSizeOptions: [...alertGroupPageSizes], showSizeChanger: true, total, onChange: changePage }} />;
}

function DetailFailure({ state, retry }: { state: AlertGroupDetailState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') return <Skeleton active paragraph={false} />;
  const message = state.kind === 'missing' ? t('common.notFound.description')
    : state.kind === 'unavailable' ? t('common.unavailable') : t('alertGroups.loadFailed');
  return <Failure message={message} retry={retry} />;
}

function Failure({ message, retry }: { message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return <Alert type="error" showIcon message={message}
    action={<Button size="small" onClick={() => { void retry(); }}>{t('common.retry')}</Button>} />;
}

export function AlertGroupPage() {
  const { t } = useTranslation();
  const controller = useAlertGroupController();
  const { command, detail, draft, editorFailure, list, query, refreshing, search } = controller.state;
  const busy = command !== 'idle';
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><Typography.Title level={2}>{t('alertGroups.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertGroups.description')}</Typography.Text></div>
        <Button type="primary" disabled={busy} onClick={controller.create}>{t('alertGroups.new')}</Button>
      </header>
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <div className={styles.toolbar}>
        <Input allowClear value={search} placeholder={t('alertGroups.search')}
          onChange={event => controller.setSearch(event.target.value)} onPressEnter={controller.submitSearch} />
        <Button type="primary" onClick={controller.submitSearch}>{t('common.query')}</Button>
        <Button loading={refreshing} onClick={() => { void controller.refresh(); }}>{t('common.refresh')}</Button>
      </div>
      <DetailFailure state={detail} retry={controller.retryDetail} />
      <GroupResults state={list} columns={buildColumns(t, busy, controller.edit, controller.toggle, controller.remove)}
        pageIndex={query.pageIndex} pageSize={query.pageSize} changePage={controller.changePage} retry={controller.refresh} />
      {draft && <AlertGroupEditor draft={draft} saving={command === 'saving'} failure={editorFailure}
        update={controller.updateDraft} close={controller.closeDraft} submit={controller.submit} />}
    </div>
  );
}
