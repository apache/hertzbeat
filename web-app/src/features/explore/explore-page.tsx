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

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Alert, Button, Skeleton } from "antd";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { loadLogSignal, loadMetricSignal, loadTraceSignal } from "./explore-api";
import {
  buildExplorePath,
  mergeExploreQuery,
  parseExploreQuery,
  type ExploreQuery,
  type ExploreQueryPatch,
  type LogExploreQuery,
  type MetricExploreQuery,
  type TraceExploreQuery,
} from "./explore-model";
import styles from "./explore-page.module.css";
import { ExploreQueryBar } from "./explore-query-bar";
import { ExploreWorkbench } from "./explore-workbench";
import { LogResult } from "./log-result";
import { MetricResult } from "./metric-result";
import { TraceResult } from "./trace-result";

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialEnd] = useState(() => Date.now());
  const query = useMemo(() => {
    const parsed = parseExploreQuery(searchParams);
    return parsed.end ? parsed : { ...parsed, end: initialEnd };
  }, [initialEnd, searchParams]);
  const updateQuery = (changes: ExploreQueryPatch) => {
    const next = mergeExploreQuery(query, changes);
    setSearchParams(new URL(buildExplorePath(next), window.location.origin).searchParams);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQuery({
      serviceName: readFormValue(event.currentTarget, "serviceName"),
      environment: readFormValue(event.currentTarget, "environment"),
      query: readFormValue(event.currentTarget, "query"),
      traceId: readFormValue(event.currentTarget, "traceId"),
      spanId: readFormValue(event.currentTarget, "spanId"),
      resourceFilter: readFormValue(event.currentTarget, "resourceFilter"),
      attributeFilter: readFormValue(event.currentTarget, "attributeFilter"),
      metricFilter: readFormValue(event.currentTarget, "metricFilter"),
      groupBy: readFormValue(event.currentTarget, "groupBy"),
      step: readFormValue(event.currentTarget, "step"),
      minDurationMs: readFormNumber(event.currentTarget, "minDurationMs"),
      maxDurationMs: readFormNumber(event.currentTarget, "maxDurationMs"),
      end: Date.now(),
      pageIndex: undefined,
    });
  };

  return (
    <div className={styles.page}>
      <ExploreWorkbench query={query} t={t} updateQuery={updateQuery} />
      <ExploreQueryBar query={query} t={t} updateQuery={updateQuery} onSubmit={onSubmit} />
      <ResultPanel query={query} t={t} navigate={navigate} />
    </div>
  );
}

function ResultPanel({
  query,
  t,
  navigate,
}: {
  query: ExploreQuery;
  t: TFunction;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (query.signal === "metrics") return <MetricResultPanel query={query} t={t} />;
  if (query.signal === "logs") return <LogResultPanel query={query} t={t} navigate={navigate} />;
  return <TraceResultPanel query={query} t={t} navigate={navigate} />;
}

function MetricResultPanel({ query, t }: { query: MetricExploreQuery; t: TFunction }) {
  const result = useQuery({
    queryKey: ["explore", query],
    queryFn: ({ signal }) => loadMetricSignal(query, signal),
    staleTime: 5_000,
  });
  return <QueryResult result={result} t={t} render={(data) => <MetricResult data={data} t={t} />} />;
}

function LogResultPanel({
  query,
  t,
  navigate,
}: {
  query: LogExploreQuery;
  t: TFunction;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const result = useQuery({
    queryKey: ["explore", query],
    queryFn: ({ signal }) => loadLogSignal(query, signal),
    staleTime: 5_000,
    enabled: !query.live,
  });
  if (query.live)
    return (
      <section className={styles.results} aria-live="polite">
        <LogResult query={query} t={t} navigate={navigate} />
      </section>
    );
  return (
    <QueryResult
      result={result}
      t={t}
      render={(data) => <LogResult data={data} query={query} t={t} navigate={navigate} />}
    />
  );
}

function TraceResultPanel({
  query,
  t,
  navigate,
}: {
  query: TraceExploreQuery;
  t: TFunction;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const result = useQuery({
    queryKey: ["explore", query],
    queryFn: ({ signal }) => loadTraceSignal(query, signal),
    staleTime: 5_000,
  });
  return (
    <QueryResult
      result={result}
      t={t}
      render={(data) => <TraceResult data={data} query={query} t={t} navigate={navigate} />}
    />
  );
}

function QueryResult<T>({
  result,
  t,
  render,
}: {
  result: UseQueryResult<T>;
  t: TFunction;
  render: (data: T) => ReactNode;
}) {
  if (result.isPending)
    return (
      <section className={styles.results} aria-live="polite">
        <Skeleton active paragraph={{ rows: 8 }} />
      </section>
    );
  if (result.isError)
    return (
      <section className={styles.results} aria-live="polite">
        <Alert
          type="error"
          showIcon
          title={t("explore.loadFailed")}
          action={<Button onClick={() => void result.refetch()}>{t("common.retry")}</Button>}
        />
      </section>
    );
  return (
    <section className={styles.results} aria-live="polite">
      {render(result.data)}
    </section>
  );
}

function readFormValue(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFormNumber(form: HTMLFormElement, name: string) {
  const value = readFormValue(form, name);
  if (value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
