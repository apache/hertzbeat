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

import { Alert, Button, Drawer, Empty, Input, Popconfirm, Select, Skeleton, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { SettingsNav } from '@/shared/settings/settings-nav';

import styles from "./alert-policy-page.module.css";
import { useNoticeTemplateController } from "./notice-template-controller";
import editorStyles from "./notice-template-editor.module.css";
import { NoticeTemplateEditor } from "./notice-template-editor";
import pageStyles from "./notice-template-page.module.css";
import { receiverTypeDefinitions } from "./notice-receiver-model";
import {
  isNoticeTemplateReadOnly,
  noticeTemplatePageSizes,
  type NoticeTemplateListState,
  type NoticeTemplateResourceRecord,
} from "./notice-template-model";

function formatTemplateTime(template: NoticeTemplateResourceRecord) {
  const value = template.gmtUpdate ?? template.gmtCreate;
  if (value == null) return "—";
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" }).format(timestamp)
    : "—";
}

function templateTypeLabel(t: TFunction, template: NoticeTemplateResourceRecord) {
  return t(
    receiverTypeDefinitions.find((definition) => definition.type === template.type)?.labelKey ??
      "noticeReceivers.types.unknown",
  );
}

function templateColumns(
  t: TFunction,
  view: (template: NoticeTemplateResourceRecord) => void,
  edit: (template: NoticeTemplateResourceRecord) => void,
  remove: (template: NoticeTemplateResourceRecord) => void,
): ColumnsType<NoticeTemplateResourceRecord> {
  return [
    { title: t("noticeTemplates.name"), dataIndex: "name", width: 260 },
    {
      title: t("noticeTemplates.type"),
      width: 180,
      render: (_value, template) => <Tag color="processing">{templateTypeLabel(t, template)}</Tag>,
    },
    {
      title: t("noticeTemplates.source"),
      width: 150,
      render: (_value, template) => (
        <Tag>{t(template.preset ? "noticeTemplates.preset" : "noticeTemplates.custom")}</Tag>
      ),
    },
    { title: t("noticeTemplates.updated"), width: 190, render: (_value, template) => formatTemplateTime(template) },
    {
      title: t("common.actions"),
      width: 160,
      render: (_value, template) =>
        isNoticeTemplateReadOnly(template) ? (
          <Button type="link" onClick={() => view(template)}>
            {t("common.view")}
          </Button>
        ) : (
          <Space>
            <Button type="link" onClick={() => edit(template)}>
              {t("common.edit")}
            </Button>
            <Popconfirm title={t("noticeTemplates.deleteConfirm")} onConfirm={() => remove(template)}>
              <Button type="link" danger>
                {t("noticeTemplates.delete")}
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];
}

function NoticeTemplateResults({
  state,
  columns,
  pageIndex,
  pageSize,
  onPageChange,
  onRetry,
}: {
  state: NoticeTemplateListState;
  columns: ColumnsType<NoticeTemplateResourceRecord>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (state.kind === "loading") {
    return (
      <div data-testid="notice-template-loading">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }
  if (state.kind === "unavailable") {
    return (
      <Alert
        type="error"
        showIcon
        message={t("common.unavailable")}
        action={<Button size="small" onClick={onRetry}>{t("common.retry")}</Button>}
      />
    );
  }
  if (state.kind === "error") {
    return (
      <Alert
        type="error"
        showIcon
        message={t("common.routeError.description")}
        action={<Button size="small" onClick={onRetry}>{t("common.retry")}</Button>}
      />
    );
  }
  if (state.kind === "empty") return <Empty description={t("noticeTemplates.empty")} />;
  return (
    <Table<NoticeTemplateResourceRecord>
      rowKey="id"
      size="small"
      dataSource={state.records}
      columns={columns}
      scroll={{ x: 940 }}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...noticeTemplatePageSizes],
        showSizeChanger: true,
        total: state.total,
        onChange: onPageChange,
      }}
    />
  );
}

function NoticeTemplateToolbar({
  name,
  preset,
  onNameChange,
  onPresetChange,
  onQuery,
  onRefresh,
  onCreate,
}: {
  name: string;
  preset: boolean;
  onNameChange: (value: string) => void;
  onPresetChange: (preset: boolean) => void;
  onQuery: () => void;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t("noticeTemplates.title")}</Typography.Title>
          <Typography.Text type="secondary">{t("noticeTemplates.description")}</Typography.Text>
        </div>
        <Button type="primary" onClick={onCreate}>
          {t("noticeTemplates.new")}
        </Button>
      </header>
      <SettingsNav />
      <div className={pageStyles.toolbar}>
        <Select
          aria-label={t("noticeTemplates.source")}
          value={preset ? "preset" : "custom"}
          options={[
            { value: "preset", label: t("noticeTemplates.preset") },
            { value: "custom", label: t("noticeTemplates.custom") },
          ]}
          onChange={(value) => onPresetChange(value === "preset")}
        />
        <Input
          allowClear
          value={name}
          placeholder={t("noticeTemplates.search")}
          onChange={(event) => onNameChange(event.target.value)}
          onPressEnter={onQuery}
        />
        <Button type="primary" onClick={onQuery}>
          {t("common.query")}
        </Button>
        <Button onClick={onRefresh}>{t("common.refresh")}</Button>
      </div>
    </>
  );
}

export function NoticeTemplatePage() {
  const { t } = useTranslation();
  const controller = useNoticeTemplateController();
  const { state } = controller;
  return (
    <div className={styles.page}>
      <NoticeTemplateToolbar
        name={state.name}
        preset={state.query.preset}
        onNameChange={controller.setName}
        onPresetChange={controller.changePreset}
        onQuery={controller.query}
        onRefresh={controller.refresh}
        onCreate={controller.create}
      />
      <NoticeTemplateResults
        state={state.list}
        columns={templateColumns(
          t,
          controller.setPreview,
          (template) => void controller.edit(template),
          (template) => void controller.remove(template),
        )}
        pageIndex={state.query.pageIndex}
        pageSize={state.query.pageSize}
        onPageChange={controller.changePage}
        onRetry={controller.refresh}
      />
      {state.draft && (
        <NoticeTemplateEditor
          draft={state.draft}
          saving={state.command === "saving"}
          update={controller.updateDraft}
          close={() => state.command === "idle" && controller.closeDraft()}
          submit={() => state.command === "idle" && void controller.submit()}
        />
      )}
      <Drawer width={720} open={state.preview != null} title={state.preview?.name} onClose={controller.closePreview}>
        {state.preview && <pre className={editorStyles.preview}>{state.preview.content}</pre>}
      </Drawer>
    </div>
  );
}
