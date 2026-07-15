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

import { Button, Checkbox, Input, Select, Tag } from "antd";
import type { TFunction } from "i18next";
import type { FormEvent } from "react";

import type {
  ExploreQuery,
  ExploreQueryPatch,
  LogExploreQuery,
  MetricExploreQuery,
  TraceExploreQuery,
} from "./explore-model";
import styles from "./explore-query-bar.module.css";

type Props = {
  query: ExploreQuery;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ExploreQueryBar({ query, t, updateQuery, onSubmit }: Props) {
  return (
    <form
      key={`${query.signal}-${query.signal === "logs" && query.live ? "live" : "query"}`}
      className={styles.form}
      onSubmit={onSubmit}
    >
      <div className={styles.primaryRow}>
        <Input
          className={styles.queryInput ?? ""}
          name="query"
          defaultValue={query.query}
          placeholder={t(`explore.queryPlaceholders.${query.signal}`)}
        />
        <Input name="serviceName" defaultValue={query.serviceName} placeholder={t("explore.serviceName")} />
        <Input name="environment" defaultValue={query.environment} placeholder={t("explore.environment")} />
        <Button className={styles.run ?? ""} type="primary" htmlType="submit">
          {t("common.query")}
        </Button>
      </div>
      <AdvancedFilters query={query} t={t} updateQuery={updateQuery} />
      <ActiveFilters query={query} t={t} updateQuery={updateQuery} />
    </form>
  );
}

function AdvancedFilters({ query, t, updateQuery }: Omit<Props, "onSubmit">) {
  return (
    <details className={styles.advanced} open={hasAdvancedFilter(query) || undefined}>
      <summary>{t("explore.advancedFilters")}</summary>
      <div className={styles.advancedFields}>
        {query.signal === "metrics" && <MetricFilters query={query} t={t} updateQuery={updateQuery} />}
        {query.signal === "logs" && <LogFilters query={query} t={t} updateQuery={updateQuery} />}
        {query.signal === "traces" && <TraceFilters query={query} t={t} updateQuery={updateQuery} />}
      </div>
    </details>
  );
}

function MetricFilters({ query, t, updateQuery }: FilterProps<MetricExploreQuery>) {
  return (
    <>
      <Input name="metricFilter" defaultValue={query.metricFilter} placeholder={t("exploreMetric.filter")} />
      <Input name="groupBy" defaultValue={query.groupBy} placeholder={t("exploreMetric.groupBy")} />
      <Select
        allowClear
        value={query.aggregation}
        placeholder={t("exploreMetric.aggregation")}
        options={["avg", "sum", "min", "max", "count"].map((value) => ({ value, label: value }))}
        onChange={(aggregation) => updateQuery({ aggregation })}
      />
      <Input name="step" defaultValue={query.step} placeholder={t("exploreMetric.step")} />
    </>
  );
}

function LogFilters({ query, t, updateQuery }: FilterProps<LogExploreQuery>) {
  return (
    <>
      <Select
        aria-label={t("explore.severity")}
        allowClear
        value={query.severityText}
        placeholder={t("explore.severity")}
        options={["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"].map((value) => ({ value, label: value }))}
        onChange={(severityText) => updateQuery({ severityText })}
      />
      <Input name="traceId" defaultValue={query.traceId} placeholder={t("explore.traceId")} />
      <Input name="spanId" defaultValue={query.spanId} placeholder={t("explore.spanId")} />
      <Input name="resourceFilter" defaultValue={query.resourceFilter} placeholder={t("exploreLog.resourceFilter")} />
      <Input
        name="attributeFilter"
        defaultValue={query.attributeFilter}
        placeholder={t("exploreLog.attributeFilter")}
      />
    </>
  );
}

function TraceFilters({ query, t, updateQuery }: FilterProps<TraceExploreQuery>) {
  return (
    <>
      <Input name="traceId" defaultValue={query.traceId} placeholder={t("explore.traceId")} />
      <Input
        name="minDurationMs"
        defaultValue={query.minDurationMs}
        placeholder={t("exploreTrace.minDuration")}
        inputMode="numeric"
      />
      <Input
        name="maxDurationMs"
        defaultValue={query.maxDurationMs}
        placeholder={t("exploreTrace.maxDuration")}
        inputMode="numeric"
      />
      <Input name="resourceFilter" defaultValue={query.resourceFilter} placeholder={t("exploreLog.resourceFilter")} />
      <Checkbox
        checked={Boolean(query.errorOnly)}
        onChange={(event) => updateQuery({ errorOnly: event.target.checked || undefined })}
      >
        {t("exploreTrace.errorOnly")}
      </Checkbox>
    </>
  );
}

type FilterProps<T extends ExploreQuery> = {
  query: T;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
};

function hasAdvancedFilter(query: ExploreQuery) {
  const filters =
    query.signal === "metrics"
      ? [query.metricFilter, query.groupBy, query.aggregation, query.step]
      : query.signal === "logs"
        ? [query.severityText, query.traceId, query.spanId, query.resourceFilter, query.attributeFilter]
        : [query.traceId, query.resourceFilter, query.minDurationMs, query.maxDurationMs, query.errorOnly];
  return filters.some((value) => value != null && value !== false && value !== "");
}

function ActiveFilters({ query, t, updateQuery }: Omit<Props, "onSubmit">) {
  const filters = [
    ...activeFilter(query.serviceName, "serviceName", t("explore.serviceContext", { value: query.serviceName })),
    ...activeFilter(query.serviceNamespace, "serviceNamespace", t("explore.serviceNamespaceContext", { value: query.serviceNamespace })),
    ...activeFilter(query.environment, "environment", t("explore.environmentContext", { value: query.environment })),
    ...activeFilter(query.collectorId, "collectorId", t("explore.collectorContext", { value: query.collectorId })),
    ...signalActiveFilters(query, t)
  ];
  if (!filters.length) return null;
  return (
    <div className={styles.activeFilters} aria-label={t("explore.activeFilters")}>
      {filters.map((filter) => (
        <Tag key={filter.key} closable onClose={() => updateQuery({ [filter.key]: undefined })}>
          {filter.label}
        </Tag>
      ))}
    </div>
  );
}

type ActiveFilter = { key: keyof ExploreQueryPatch; label: string };

function activeFilter(value: unknown, key: keyof ExploreQueryPatch, label: string): ActiveFilter[] {
  return value ? [{ key, label }] : [];
}

function signalActiveFilters(query: ExploreQuery, t: TFunction): ActiveFilter[] {
  if (query.signal === "metrics") return [];
  const trace = activeFilter(query.traceId, "traceId", t("explore.traceIdContext", { value: query.traceId }));
  if (query.signal === "logs") {
    return [
      ...activeFilter(query.severityText, "severityText", `${t("explore.severity")}: ${query.severityText}`),
      ...trace,
      ...activeFilter(query.spanId, "spanId", t("explore.spanIdContext", { value: query.spanId }))
    ];
  }
  return [...trace, ...activeFilter(query.errorOnly, "errorOnly", t("exploreTrace.errorOnly"))];
}
