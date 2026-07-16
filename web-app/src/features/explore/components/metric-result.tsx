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

import { Alert, Table, Tag } from "antd";
import type { TFunction } from "i18next";

import type { MetricConsole } from "../model/explore-signal-contract";
import { metricPath, metricPoints, metricResultState, type MetricSeries } from "../model/explore-signal-model";
import styles from "./metric-result.module.css";
import { SignalEmptyState, SignalResultFrame } from "./signal-result-frame";

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 220;
const COLORS = ["#4f6bed", "#00a389", "#d97706", "#c24172", "#7c3aed", "#0891b2"];

type SampleRow = {
  key: string;
  seriesKey: string;
  seriesName: string;
  timestamp: number;
  value: number;
  unit?: string | undefined;
};

export function MetricResult({ data, t }: { data: MetricConsole; t: TFunction }) {
  const state = metricResultState(data);
  if (state.kind === "error") return <Alert type="error" showIcon message={state.message ?? t("explore.loadFailed")} />;
  if (state.kind === "unavailable") return <Alert type="warning" showIcon message={t("common.unavailable")} />;
  if (state.kind === "empty")
    return (
      <SignalResultFrame title={t("explore.signals.metrics")} count={0} unit={t("exploreMetric.series")}>
        <SignalEmptyState title={t("explore.empty.metrics")} hint={t("explore.description")} />
      </SignalResultFrame>
    );
  const series = state.series;
  const samples = buildSampleRows(series);

  return (
    <SignalResultFrame
      title={t("explore.signals.metrics")}
      count={data.stats?.totalSeries ?? series.length}
      unit={t("exploreMetric.series")}
      meta={[
        { label: t("explore.samples"), value: samples.length },
        { label: t("exploreMetric.datasource"), value: data.datasource ?? "—" },
        { label: t("exploreMetric.queryMode"), value: data.queryMode ?? "—" },
      ]}
    >
      <section className={styles.chartSection} aria-label={t("exploreMetric.trend")}>
        <div className={styles.legend}>
          {series.slice(0, COLORS.length).map((item, index) => (
            <span key={item.key}>
              <i style={{ backgroundColor: COLORS[index] }} />
              {seriesLabel(item)}
            </span>
          ))}
        </div>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={t("exploreMetric.trend")}
          preserveAspectRatio="none"
        >
          <line x1="0" x2={CHART_WIDTH} y1="0" y2="0" />
          <line x1="0" x2={CHART_WIDTH} y1={CHART_HEIGHT / 2} y2={CHART_HEIGHT / 2} />
          <line x1="0" x2={CHART_WIDTH} y1={CHART_HEIGHT} y2={CHART_HEIGHT} />
          {series.slice(0, COLORS.length).map((item, index) => (
            <path key={item.key} d={metricPath(metricPoints(item), CHART_WIDTH, CHART_HEIGHT)} stroke={COLORS[index]} />
          ))}
        </svg>
      </section>

      <Table<SampleRow>
        rowKey="key"
        size="small"
        dataSource={samples.slice(-100).reverse()}
        pagination={false}
        scroll={{ x: 760, y: 320 }}
        columns={[
          {
            title: t("explore.time"),
            dataIndex: "timestamp",
            render: (value) => new Date(value as number).toLocaleString(),
          },
          { title: t("explore.metric"), dataIndex: "seriesName" },
          {
            title: t("exploreMetric.value"),
            dataIndex: "value",
            render: (value, row) => `${String(value)}${row.unit ? ` ${row.unit}` : ""}`,
          },
          {
            title: t("explore.labels"),
            render: (_, row) => {
              const item = series.find((candidate) => candidate.key === row.seriesKey);
              return item
                ? Object.entries(item.labels)
                    .filter(([key]) => key !== "__name__")
                    .map(([key, value]) => (
                      <Tag key={key}>
                        {key}={value}
                      </Tag>
                    ))
                : "—";
            },
          },
        ]}
      />
    </SignalResultFrame>
  );
}

function buildSampleRows(series: MetricSeries[]): SampleRow[] {
  return series.flatMap((item) =>
    metricPoints(item).map((point, index) => ({
      key: `${item.key}-${point.timestamp}-${index}`,
      seriesKey: item.key,
      seriesName: item.name,
      timestamp: point.timestamp,
      value: point.value,
      unit: item.unit,
    })),
  );
}

function seriesLabel(series: MetricSeries) {
  const service = series.labels.service_name;
  return service ? `${series.name} · ${service}` : series.name;
}
