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
import { Alert, App, Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { SettingsNav } from '@/shared/settings/settings-nav';
import styles from "../components/token.module.css";
import { GeneratedTokenModal, TokenGeneratorModal } from "../components/token-modals";
import { generateToken, loadTokens, revokeToken } from "../api/token-api";
import { createTokenDraft, isTokenExpired, validateTokenDraft, type AuthToken, type TokenDraft } from "../model/token-model";

function formatTokenTime(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "—";
}

function tokenColumns(t: TFunction, confirmRevoke: (token: AuthToken) => void): ColumnsType<AuthToken> {
  return [
    {
      title: t("token.name"),
      dataIndex: "name",
      width: 180,
      render: (value: string | null | undefined) => value || "—",
    },
    {
      title: t("token.mask"),
      dataIndex: "tokenMask",
      width: 180,
      render: (value: string | null | undefined) => (
        <Typography.Text className={styles.tokenMask ?? ""} code>
          {value || "—"}
        </Typography.Text>
      ),
    },
    {
      title: t("token.scope.label"),
      dataIndex: "tokenScope",
      width: 150,
      render: (value: string | null | undefined) => (
        <Tag>
          {t(
            `token.scope.${value === "otlp-ingest" ? "otlpIngest" : value === "readonly-query" ? "readonlyQuery" : "apiAdmin"}`,
          )}
        </Tag>
      ),
    },
    {
      title: t("token.creator"),
      dataIndex: "creator",
      width: 140,
      render: (value: string | null | undefined) => value || "—",
    },
    { title: t("token.created"), dataIndex: "gmtCreate", width: 190, render: formatTokenTime },
    {
      title: t("token.expires"),
      dataIndex: "expireTime",
      width: 210,
      render: (value: string | number | null | undefined, token) =>
        value == null ? (
          <Tag color="success">{t("token.expiration.never")}</Tag>
        ) : (
          <Space size={6}>
            <span>{formatTokenTime(value)}</span>
            {isTokenExpired(token) && <Tag color="error">{t("token.expired")}</Tag>}
          </Space>
        ),
    },
    { title: t("token.lastUsed"), dataIndex: "lastUsedTime", width: 190, render: formatTokenTime },
    {
      title: t("common.actions"),
      fixed: "right",
      width: 110,
      render: (_value, token) => (
        <Button
          danger
          type="link"
          onClick={() => {
            confirmRevoke(token);
          }}
        >
          {t("token.revoke")}
        </Button>
      ),
    },
  ];
}

function TokenTable({
  tokens,
  loading,
  failed,
  onRetry,
  onRevoke,
}: {
  tokens: AuthToken[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onRevoke: (token: AuthToken) => void;
}) {
  const { t } = useTranslation();
  if (failed) {
    return (
      <Alert
        type="error"
        showIcon
        message={t("token.unavailable")}
        action={
          <Button size="small" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        }
      />
    );
  }
  return (
    <div className={styles.table}>
      <Table<AuthToken>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={tokens}
        columns={tokenColumns(t, onRevoke)}
        locale={{ emptyText: <Empty description={t("token.empty")} /> }}
        pagination={false}
        scroll={{ x: 1380 }}
      />
    </div>
  );
}

export function TokenPage() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState<TokenDraft | null>(null);
  const [generatedToken, setGeneratedToken] = useState("");
  const tokens = useQuery({ queryKey: ["tokens"], queryFn: loadTokens });
  const generate = useMutation({
    mutationFn: async (tokenDraft: TokenDraft) => {
      const token = await generateToken(tokenDraft);
      setDraft(null);
      setGeneratedToken(token);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
    onError: () => void message.error(t("token.generateFailed")),
  });
  const revoke = useMutation({
    mutationFn: revokeToken,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tokens"] });
      void message.success(t("token.revokeSuccess"));
    },
    onError: () => void message.error(t("token.revokeFailed")),
  });

  const openGenerator = () => setDraft(createTokenDraft(searchParams.get("scope")));
  const submit = () => {
    if (!draft || validateTokenDraft(draft).length > 0) {
      void message.warning(t("token.validation"));
      return;
    }
    generate.mutate(draft);
  };
  const confirmRevoke = (token: AuthToken) => {
    modal.confirm({
      title: t("token.revokeConfirm"),
      content: t("token.revokeConfirmDescription", { name: token.name || token.tokenMask || "—" }),
      okText: t("token.revoke"),
      okButtonProps: { danger: true },
      cancelText: t("common.cancel"),
      onOk: () => revoke.mutate(token.id),
    });
  };
  const copyGeneratedToken = async () => {
    try {
      await navigator.clipboard.writeText(generatedToken);
      void message.success(t("token.copySuccess"));
    } catch {
      void message.error(t("token.copyFailed"));
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t("token.title")}</Typography.Title>
          <Typography.Text type="secondary">{t("token.description")}</Typography.Text>
        </div>
        <Button type="primary" loading={generate.isPending} onClick={openGenerator}>
          {t("token.generate")}
        </Button>
      </header>
      <SettingsNav />
      <TokenTable
        tokens={tokens.data ?? []}
        loading={tokens.isPending}
        failed={tokens.isError}
        onRetry={() => void tokens.refetch()}
        onRevoke={confirmRevoke}
      />
      {draft && (
        <TokenGeneratorModal
          draft={draft}
          saving={generate.isPending}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSubmit={submit}
        />
      )}
      {generatedToken && (
        <GeneratedTokenModal
          token={generatedToken}
          onCopy={() => void copyGeneratedToken()}
          onClose={() => setGeneratedToken("")}
        />
      )}
    </div>
  );
}
