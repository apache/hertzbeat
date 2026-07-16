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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import styles from "./label-page.module.css";
import { deleteLabel, loadLabels, saveLabel } from "./label-api";
import {
  buildLabelDisplayName,
  labelPageSizes,
  labelTypeKey,
  readLabelQuery,
  writeLabelQuery,
  type LabelRecord,
} from "./label-model";
import { SettingsNav } from '@/shared/settings/settings-nav';

type Translator = (key: string) => string;
type LabelEditorState = {
  value: Partial<LabelRecord>;
  isNew: boolean;
};

function formatTime(value?: number | string) {
  if (value == null) return "—";
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);
}

export function LabelPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readLabelQuery(searchParams);
  const [draftSearch, setDraftSearch] = useState(query.search);
  const [editor, setEditor] = useState<LabelEditorState>();
  const labels = useQuery({ queryKey: ["labels", query], queryFn: () => loadLabels(query) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["labels"] });
  const save = useMutation({
    mutationFn: ({ value, isNew }: { value: Partial<LabelRecord>; isNew: boolean }) => saveLabel(value, isNew),
    onSuccess: () => {
      setEditor(undefined);
      refresh();
      void message.success(t("labels.saveSuccess"));
    },
    onError: () => void message.error(t("labels.saveFailed")),
  });
  const remove = useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      refresh();
      void message.success(t("labels.deleteSuccess"));
    },
    onError: () => void message.error(t("labels.deleteFailed")),
  });
  const copy = async (label: LabelRecord) => {
    try {
      await navigator.clipboard.writeText(buildLabelDisplayName(label));
      void message.success(t("labels.copySuccess"));
    } catch {
      void message.error(t("labels.copyFailed"));
    }
  };
  const columns = buildColumns({
    t,
    copy: (label) => void copy(label),
    edit: (label) => setEditor({ value: { ...label }, isNew: false }),
    remove: (id) => remove.mutate(id),
    inspect: (label) => {
      const value = encodeURIComponent(buildLabelDisplayName(label));
      void navigate(`/monitors?labels=${value}`);
    },
  });
  const updateQuery = (patch: Partial<typeof query>) => setSearchParams(writeLabelQuery({ ...query, ...patch }));

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t("labels.title")}</Typography.Title>
        <Typography.Text type="secondary">{t("labels.description")}</Typography.Text>
      </header>
      <SettingsNav />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={draftSearch}
          placeholder={t("labels.search")}
          onChange={(event) => setDraftSearch(event.target.value)}
          onPressEnter={() => updateQuery({ search: draftSearch.trim(), pageIndex: 0 })}
        />
        <Button type="primary" onClick={() => updateQuery({ search: draftSearch.trim(), pageIndex: 0 })}>
          {t("common.query")}
        </Button>
        <Button onClick={() => void labels.refetch()}>{t("common.refresh")}</Button>
        <Button type="primary" onClick={() => setEditor({ value: {}, isNew: true })}>
          {t("labels.new")}
        </Button>
      </div>
      <LabelResults
        columns={columns}
        loading={labels.isPending}
        error={labels.isError}
        records={labels.data?.content ?? []}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        total={labels.data?.totalElements ?? 0}
        onPageChange={(pageIndex, pageSize) => updateQuery({ pageIndex, pageSize })}
      />
      {editor && (
        <LabelEditor
          editor={editor}
          saving={save.isPending}
          onCancel={() => setEditor(undefined)}
          onSubmit={(value) => save.mutate({ value, isNew: editor.isNew })}
        />
      )}
    </div>
  );
}

type ColumnActions = {
  t: Translator;
  copy: (label: LabelRecord) => void;
  edit: (label: LabelRecord) => void;
  remove: (id: number) => void;
  inspect: (label: LabelRecord) => void;
};

function buildColumns(actions: ColumnActions): ColumnsType<LabelRecord> {
  const { t, copy, edit, remove, inspect } = actions;
  return [
    {
      title: t("labels.label"),
      render: (_value, row) => (
        <Button type="link" className={styles.labelLink ?? ""} onClick={() => inspect(row)}>
          <Tag>{buildLabelDisplayName(row)}</Tag>
        </Button>
      ),
    },
    {
      title: t("labels.descriptionLabel"),
      dataIndex: "description",
      render: (value: string | undefined) => value || "—",
    },
    {
      title: t("labels.type.label"),
      dataIndex: "type",
      width: 120,
      render: (value: number | undefined) => t(labelTypeKey(value)),
    },
    {
      title: t("labels.updated"),
      dataIndex: "gmtUpdate",
      width: 180,
      render: (value: number | string | undefined, row) => formatTime(value ?? row.gmtCreate),
    },
    {
      title: t("common.actions"),
      width: 220,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" onClick={() => copy(row)}>
            {t("labels.copy")}
          </Button>
          <Button type="link" onClick={() => edit(row)}>
            {t("common.edit")}
          </Button>
          <Popconfirm title={t("labels.deleteConfirm")} onConfirm={() => row.id && remove(row.id)}>
            <Button type="link" danger>
              {t("labels.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

type LabelResultsProps = {
  columns: ColumnsType<LabelRecord>;
  loading: boolean;
  error: boolean;
  records: LabelRecord[];
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number, pageSize: number) => void;
};

function LabelResults(props: LabelResultsProps) {
  const { t } = useTranslation();
  if (props.error) return <Alert type="error" showIcon title={t("labels.unavailable")} />;
  if (!props.loading && props.records.length === 0) {
    return <Empty description={t("labels.empty")} />;
  }

  return (
    <Table<LabelRecord>
      rowKey="id"
      size="small"
      loading={props.loading}
      columns={props.columns}
      dataSource={props.records}
      pagination={{
        current: props.pageIndex + 1,
        pageSize: props.pageSize,
        pageSizeOptions: [...labelPageSizes],
        showSizeChanger: true,
        total: props.total,
        onChange: (page, pageSize) => props.onPageChange(page - 1, pageSize),
      }}
    />
  );
}

type LabelEditorProps = {
  editor: LabelEditorState;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (value: Partial<LabelRecord>) => void;
};

function LabelEditor({ editor, saving, onCancel, onSubmit }: LabelEditorProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<Partial<LabelRecord>>();
  const submit = (values: Partial<LabelRecord>) => onSubmit({ ...editor.value, ...values });

  return (
    <Modal
      open
      destroyOnHidden
      title={t(editor.isNew ? "labels.new" : "labels.edit")}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" initialValues={editor.value} onFinish={submit}>
        <Form.Item
          name="name"
          label={t("labels.name")}
          rules={[{ required: true, whitespace: true, message: t("labels.nameRequired") }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="tagValue" label={t("labels.value")}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t("labels.descriptionLabel")}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
