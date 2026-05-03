/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export class OtlpSignalOverview {
  signal!: string;
  active: boolean = false;
  totalCount: number = 0;
  latestObservedAt?: number | null;
  intakeMode?: string;
  summary?: string;
}

export class OtlpRecentSignalEvent {
  signal!: string;
  title?: string;
  detail?: string;
  observedAt?: number | null;
}

export class OtlpIngestionOverview {
  metrics = new OtlpSignalOverview();
  logs = new OtlpSignalOverview();
  traces = new OtlpSignalOverview();
  activeSignalCount: number = 0;
  latestObservedAt?: number | null;
  recentServiceCount: number = 0;
  boundEntityCount: number = 0;
  recentEvents: OtlpRecentSignalEvent[] = [];
}

export class OtlpSignalGuide {
  signal!: string;
  protocol?: string;
  mode?: string;
  endpoint?: string;
  summary?: string;
  note?: string;
}

export class OtlpGuideSnippet {
  key!: string;
  protocol?: string;
  title!: string;
  language?: string;
  content?: string;
}

export class OtlpIngestionGuide {
  httpProtocolLabel?: string;
  grpcProtocolLabel?: string;
  authHeaderName?: string;
  authHeaderExample?: string;
  grpcAuthorityExample?: string;
  signals: OtlpSignalGuide[] = [];
  snippets: OtlpGuideSnippet[] = [];
}

export class OtlpCanonicalIdentitySample {
  key!: string;
  value!: string;
  signal!: string;
}

export class OtlpBoundEntity {
  entityId!: number;
  type?: string;
  name?: string;
  displayName?: string;
  namespace?: string;
  primaryIdentityKey?: string;
  primaryIdentityValue?: string;
  monitorBindCount: number = 0;
}

export class OtlpEntityBindingSummary {
  canonicalIdentityKeys: string[] = [];
  recentServices: string[] = [];
  recentIdentitySamples: OtlpCanonicalIdentitySample[] = [];
  recentBoundEntities: OtlpBoundEntity[] = [];
}

export interface OtlpMetricsConsoleQueryParams {
  entityId?: string | number | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  environment?: string | null;
  start?: number | null;
  end?: number | null;
  query?: string | null;
  groupBy?: string | null;
  aggregation?: string | null;
}

export class OtlpMetricsField {
  name!: string;
  type?: string;
  unit?: string;
}

export class OtlpMetricsSchema {
  fields: OtlpMetricsField[] = [];
  labels: Record<string, string> = {};
  meta: Record<string, string> = {};
}

export class OtlpMetricsFrame {
  schema = new OtlpMetricsSchema();
  data: Array<Array<number | string | null>> = [];
}

export class OtlpMetricsConsoleResults {
  refId?: string;
  status?: number;
  msg?: string;
  frames: OtlpMetricsFrame[] = [];
}

export class OtlpMetricsConsoleContext {
  entityId?: number;
  entityName?: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  start?: number;
  end?: number;
}

export class OtlpMetricsConsoleStats {
  totalSeries: number = 0;
  nonEmptySeries: number = 0;
  latestObservedAt?: number | null;
}

export class OtlpMetricsConsole {
  context = new OtlpMetricsConsoleContext();
  query?: string;
  datasource?: string;
  queryMode?: string;
  results = new OtlpMetricsConsoleResults();
  stats = new OtlpMetricsConsoleStats();
  emptyStateReason?: string | null;
  errorMessage?: string | null;
}
