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

import { Alert, Button, Descriptions, Drawer, Table, Tag, Typography } from "antd";
import type { TFunction } from "i18next";
import { useEffect, useState, type ReactNode } from "react";

import { buildLogStreamPath, openLogStream, type ExplorePageResult } from "../api/explore-api";
import type { LogRow } from "../model/explore-signal-contract";
import { buildCrossSignalPath, buildExplorePath, type LogExploreQuery } from "../model/explore-model";
import { logBody, logServiceName, logTimestampMs } from "../model/explore-signal-model";
import styles from "./log-result.module.css";
import { OtlpAttributeSection } from "./otlp-attribute-list";
import { SignalEmptyState, SignalResultFrame } from "./signal-result-frame";

const MAX_STREAM_ROWS = 500;
type OpenPath = (path: string) => void;

export function LogResult({
  data,
  query,
  t,
  navigate,
}: {
  data?: ExplorePageResult<LogRow> | undefined;
  query: LogExploreQuery;
  t: TFunction;
  navigate: OpenPath;
}) {
  if (query.live) {
    const streamPath = buildLogStreamPath(query);
    return <LogStreamResult key={streamPath} streamPath={streamPath} query={query} t={t} navigate={navigate} />;
  }
  const rows = data?.content ?? [];
  if (!data || data.totalElements === 0)
    return (
      <SignalResultFrame title={t("explore.signals.logs")} count={0}>
        <SignalEmptyState title={t("explore.empty.logs")} hint={t("explore.description")} />
      </SignalResultFrame>
    );
  return <LogRows rows={rows} data={data} query={query} t={t} navigate={navigate} />;
}

function LogStreamResult({
  streamPath,
  query,
  t,
  navigate,
}: {
  streamPath: string;
  query: LogExploreQuery;
  t: TFunction;
  navigate: OpenPath;
}) {
  const [paused, setPaused] = useState(false);
  const stream = useLogStream(streamPath, paused);
  const actions = (
    <div className={styles.streamActions}>
      <Button size="small" onClick={() => setPaused((current) => !current)}>
        {t(paused ? "exploreLog.resume" : "exploreLog.pause")}
      </Button>
      <Button size="small" disabled={stream.rows.length === 0} onClick={stream.clear}>
        {t("exploreLog.clear")}
      </Button>
    </div>
  );
  const connection = paused ? (
    <span className={styles.paused}>{t("exploreLog.paused")}</span>
  ) : (
    <StreamConnection connected={stream.connected} t={t} />
  );
  return (
    <div>
      {stream.failed && <Alert type="error" showIcon message={t("exploreLog.streamFailed")} />}
      {stream.rows.length === 0 ? (
        <SignalResultFrame
          title={t("exploreLog.live")}
          count={0}
          meta={[{ label: t("exploreLog.streamStatus"), value: connection }]}
          actions={actions}
        >
          <SignalEmptyState title={t("exploreLog.waiting")} hint={t("explore.description")} />
        </SignalResultFrame>
      ) : (
        <LogRows
          rows={stream.rows}
          query={query}
          t={t}
          navigate={navigate}
          live
          connection={connection}
          actions={actions}
        />
      )}
    </div>
  );
}

function StreamConnection({ connected, t }: { connected: boolean; t: TFunction }) {
  return (
    <span className={styles.streamConnection}>
      <i data-connected={connected} />
      {t(connected ? "exploreLog.connected" : "exploreLog.connecting")}
    </span>
  );
}

function LogRows({
  rows,
  data,
  query,
  t,
  navigate,
  live,
  connection,
  actions,
}: {
  rows: LogRow[];
  data?: ExplorePageResult<LogRow> | undefined;
  query: LogExploreQuery;
  t: TFunction;
  navigate: OpenPath;
  live?: boolean | undefined;
  connection?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  const [selected, setSelected] = useState<LogRow>();

  return (
    <SignalResultFrame
      title={t(live ? "exploreLog.live" : "explore.signals.logs")}
      count={data?.totalElements ?? rows.length}
      meta={live ? [{ label: t("exploreLog.streamStatus"), value: connection }] : []}
      actions={actions}
    >
      <Table<LogRow>
        className={styles.clickableTable ?? ""}
        rowKey={(row) =>
          `${row.timeUnixNano ?? row.observedTimeUnixNano ?? "log"}-${row.traceId ?? ""}-${row.spanId ?? ""}`
        }
        size="small"
        dataSource={rows}
        pagination={logPagination(data, query, navigate)}
        scroll={{ x: 980, y: 520 }}
        onRow={(row) => ({ onClick: () => setSelected(row) })}
        columns={[
          { title: t("explore.time"), width: 190, render: (_, row) => formatLogTime(row) },
          {
            title: t("explore.severity"),
            width: 100,
            render: (_, row) => <Tag color={severityColor(row.severityText ?? undefined)}>{row.severityText ?? "—"}</Tag>,
          },
          { title: t("explore.service"), width: 170, render: (_, row) => logServiceName(row) ?? "—" },
          { title: t("explore.message"), ellipsis: true, render: (_, row) => logBody(row) ?? "—" },
          {
            title: t("explore.trace"),
            width: 190,
            render: (_, row) =>
              row.traceId ? (
                <Button
                  className={styles.traceLink ?? ""}
                  type="link"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigate(buildCrossSignalPath(query, "traces", { traceId: row.traceId ?? undefined }));
                  }}
                >
                  {shortId(row.traceId)}
                </Button>
              ) : (
                "—"
              ),
          },
        ]}
      />
      <LogDetail row={selected} t={t} query={query} navigate={navigate} onClose={() => setSelected(undefined)} />
    </SignalResultFrame>
  );
}

function logPagination(data: ExplorePageResult<LogRow> | undefined, query: LogExploreQuery, navigate: OpenPath) {
  if (!data) return false as const;
  return {
    current: data.number + 1,
    pageSize: data.size,
    total: data.totalElements,
    hideOnSinglePage: true,
    showSizeChanger: false,
    onChange: (page: number) => {
      void navigate(buildExplorePath({ ...query, pageIndex: page - 1 || undefined }));
    },
  };
}

function LogDetail({
  row,
  t,
  query,
  navigate,
  onClose,
}: {
  row?: LogRow | undefined;
  t: TFunction;
  query: LogExploreQuery;
  navigate: OpenPath;
  onClose: () => void;
}) {
  return (
    <Drawer
      size="large"
      open={Boolean(row)}
      title={t("exploreLog.detail")}
      onClose={onClose}
      extra={
        row?.traceId ? (
          <Button
            onClick={() => {
              void navigate(buildCrossSignalPath(query, "traces", { traceId: row.traceId ?? undefined }));
            }}
          >
            {t("exploreLog.openTrace")}
          </Button>
        ) : undefined
      }
    >
      {row && (
        <>
          <Typography.Paragraph className={styles.body ?? ""}>{logBody(row) ?? "—"}</Typography.Paragraph>
          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              { key: "time", label: t("explore.time"), children: formatLogTime(row) },
              { key: "severity", label: t("explore.severity"), children: row.severityText ?? "—" },
              { key: "trace", label: "Trace ID", children: row.traceId ?? "—" },
              { key: "span", label: "Span ID", children: row.spanId ?? "—" },
            ]}
          />
          <OtlpAttributeSection title={t("exploreLog.resourceAttributes")} value={row.resource ?? undefined} />
          <OtlpAttributeSection title={t("exploreLog.logAttributes")} value={row.attributes ?? undefined} />
        </>
      )}
    </Drawer>
  );
}

function useLogStream(streamPath: string, paused: boolean) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (paused) return;
    const source = openLogStream(streamPath);
    source.onopen = () => {
      setConnected(true);
      setFailed(false);
    };
    source.onerror = () => {
      setConnected(false);
      setFailed(true);
    };
    source.addEventListener("LOG_EVENT", (event) => {
      try {
        const row = JSON.parse((event as MessageEvent<string>).data) as LogRow;
        setRows((current) => [row, ...current].slice(0, MAX_STREAM_ROWS));
      } catch {
        setFailed(true);
      }
    });
    return () => source.close();
  }, [paused, streamPath]);

  return { rows, connected: connected && !paused, failed, clear: () => setRows([]) };
}

function formatLogTime(row: LogRow) {
  const timestamp = logTimestampMs(row);
  return timestamp == null ? "—" : new Date(timestamp).toLocaleString();
}

function shortId(value: string) {
  return value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value;
}

function severityColor(severity?: string) {
  const normalized = severity?.toUpperCase() ?? "";
  if (normalized.includes("ERROR") || normalized.includes("FATAL")) return "red";
  if (normalized.includes("WARN")) return "gold";
  if (normalized.includes("INFO")) return "blue";
  return "default";
}
