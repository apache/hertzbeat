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

import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Descriptions, Drawer, Empty, Skeleton, Table, Tag, Typography } from "antd";
import type { TFunction } from "i18next";
import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import { loadTraceDetail, type ExplorePageResult } from "../api/explore-api";
import type { TraceDetail, TraceRow, TraceSpan } from "../api/explore-signal-contract";
import { buildCrossSignalPath, buildExplorePath, mergeExploreQuery, type TraceExploreQuery } from "../model/explore-model";
import { traceDurationMs, traceSpanLayout } from "../model/explore-signal-model";
import { OtlpAttributeList, OtlpAttributeSection } from "./otlp-attribute-list";
import { SignalEmptyState, SignalResultFrame } from "./signal-result-frame";
import styles from "./trace-result.module.css";

export function TraceResult({
  data,
  query,
  t,
  navigate,
}: {
  data: ExplorePageResult<TraceRow>;
  query: TraceExploreQuery;
  t: TFunction;
  navigate: NavigateFunction;
}) {
  const [traceId, setTraceId] = useState<string>();
  const rows = data.content ?? [];
  if (rows.length === 0)
    return (
      <SignalResultFrame title={t("explore.signals.traces")} count={0}>
        <SignalEmptyState title={t("explore.empty.traces")} hint={t("explore.description")} />
      </SignalResultFrame>
    );
  return (
    <SignalResultFrame title={t("explore.signals.traces")} count={data.totalElements}>
      <Table<TraceRow>
        className={styles.clickableTable ?? ""}
        rowKey={(row) => row.traceId ?? row.rootSpanId ?? ""}
        size="small"
        dataSource={rows}
        scroll={{ x: 900, y: 520 }}
        onRow={(row) => ({ onClick: () => setTraceId(row.traceId) })}
        pagination={{
          current: data.number + 1,
          pageSize: data.size,
          total: data.totalElements,
          showSizeChanger: false,
          hideOnSinglePage: true,
          onChange: (page) => {
            void navigate(buildExplorePath({ ...query, pageIndex: page - 1 || undefined }));
          },
        }}
        columns={[
          {
            title: t("explore.time"),
            width: 190,
            render: (_, row) => (row.startTime ? new Date(row.startTime).toLocaleString() : "—"),
          },
          { title: t("explore.service"), width: 180, dataIndex: "serviceName" },
          { title: t("explore.operation"), dataIndex: "rootSpanName", ellipsis: true },
          { title: t("explore.duration"), width: 120, render: (_, row) => formatDuration(traceDurationMs(row)) },
          {
            title: t("exploreTrace.status"),
            width: 100,
            render: (_, row) => <Tag color={row.errorSpanCount ? "red" : "green"}>{row.status ?? "—"}</Tag>,
          },
          { title: "Trace ID", width: 220, dataIndex: "traceId", ellipsis: true },
        ]}
      />
      <TraceDrawer traceId={traceId} query={query} t={t} navigate={navigate} onClose={() => setTraceId(undefined)} />
    </SignalResultFrame>
  );
}

function TraceDrawer({
  traceId,
  query,
  t,
  navigate,
  onClose,
}: {
  traceId?: string | undefined;
  query: TraceExploreQuery;
  t: TFunction;
  navigate: NavigateFunction;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ["trace-detail", traceId],
    queryFn: ({ signal }) => loadTraceDetail(traceId ?? '', signal),
    enabled: Boolean(traceId),
  });
  return (
    <Drawer
      size="large"
      open={Boolean(traceId)}
      title={detail.data?.rootSpanName ?? t("exploreTrace.detail")}
      onClose={onClose}
    >
      {detail.isPending && <Skeleton active paragraph={{ rows: 10 }} />}
      {detail.isError && <Alert type="error" showIcon title={t("exploreTrace.loadFailed")} />}
      {detail.data && <TraceDetailView detail={detail.data} query={query} t={t} navigate={navigate} />}
    </Drawer>
  );
}

function TraceDetailView({
  detail,
  query,
  t,
  navigate,
}: {
  detail: TraceDetail;
  query: TraceExploreQuery;
  t: TFunction;
  navigate: NavigateFunction;
}) {
  const spans = traceSpanLayout(detail);
  const [spanId, setSpanId] = useState<string>();
  const selected = spans.find((span) => span.spanId === spanId) ?? spans[0];
  return (
    <>
      <div className={styles.detailToolbar}>
        <div className={styles.traceSummary}>
          <strong>{formatDuration(traceDurationMs(detail))}</strong>
          <span>
            {spans.length} {t("exploreTrace.spans")}
          </span>
          <span>
            {detail.errorSpanCount ?? 0} {t("exploreTrace.errors")}
          </span>
        </div>
        <div className={styles.actions}>
          <Button
            onClick={() => {
              void navigate(buildCrossSignalPath(query, "logs", { traceId: detail.traceId }));
            }}
          >
            {t("explore.relatedLogs")}
          </Button>
          <Button
            onClick={() => {
              void navigate(
                buildExplorePath(
                  mergeExploreQuery(query, {
                    signal: "metrics",
                    serviceName: selected?.serviceName ?? detail.serviceName,
                    query: undefined,
                    traceId: undefined,
                    pageIndex: undefined,
                  }),
                ),
              );
            }}
          >
            {t("exploreTrace.relatedMetrics")}
          </Button>
        </div>
      </div>
      <div className={styles.waterfall}>
        {spans.map((span) => (
          <button
            key={span.spanId}
            type="button"
            data-selected={span.spanId === selected?.spanId}
            className={styles.spanRow}
            onClick={() => setSpanId(span.spanId)}
          >
            <span className={styles.spanName} style={{ paddingLeft: `${span.depth * 16 + 8}px` }}>
              <strong>{span.serviceName ?? "—"}</strong>
              <small>{span.spanName ?? "—"}</small>
            </span>
            <span className={styles.track}>
              <i
                data-error={span.status === "error"}
                style={{
                  left: `${span.offsetPercent}%`,
                  width: `${Math.min(span.widthPercent, 100 - span.offsetPercent)}%`,
                }}
              />
            </span>
            <span className={styles.spanDuration}>{formatDuration((span.durationNanos ?? 0) / 1_000_000)}</span>
          </button>
        ))}
      </div>
      {selected && <SpanDetail span={selected} t={t} />}
    </>
  );
}

function SpanDetail({ span, t }: { span: TraceSpan; t: TFunction }) {
  return (
    <section className={styles.spanDetail}>
      <Typography.Title level={4}>{span.spanName}</Typography.Title>
      <Descriptions
        size="small"
        column={2}
        bordered
        items={[
          { key: "span", label: "Span ID", children: span.spanId ?? "—" },
          { key: "kind", label: t("exploreTrace.kind"), children: span.spanKind ?? "—" },
          { key: "status", label: t("exploreTrace.status"), children: span.status ?? "—" },
          { key: "scope", label: t("exploreTrace.scope"), children: span.scopeName ?? "—" },
        ]}
      />
      <OtlpAttributeSection title={t("exploreTrace.spanAttributes")} value={span.spanAttributes} />
      <OtlpAttributeSection title={t("exploreTrace.resourceAttributes")} value={span.resourceAttributes} />
      <section className={styles.events}>
        <Typography.Title level={5}>{t("exploreTrace.events")}</Typography.Title>
        {(span.events ?? []).length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          span.events?.map((event, index) => (
            <div key={`${event.name ?? "event"}-${index}`}>
              <strong>{event.name ?? "—"}</strong>
              <OtlpAttributeList value={event.attributes} />
            </div>
          ))
        )}
      </section>
    </section>
  );
}

function formatDuration(value?: number) {
  if (value == null) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value.toFixed(2)} ms`;
}
