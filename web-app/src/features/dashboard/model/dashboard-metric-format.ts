/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// The exact collector metric is defined in bytes by OpenTelemetry's process telemetry.
// Do not infer units for arbitrary metric names or override declared metadata.
export function dashboardMetricFormat(name: string, unit: string | undefined, values: number[]) {
  const declared = unit?.trim();
  const bytes = declared
    ? ['By', 'byte', 'bytes', 'B'].includes(declared)
    : name === 'otelcol_process_memory_rss_bytes';
  const magnitude = Math.max(...values.map(Math.abs), 0);
  const scale = bytes && magnitude > 0 ? Math.min(4, Math.max(0, Math.floor(Math.log2(magnitude) / 10))) : 0;
  const suffix = bytes ? ['B', 'KiB', 'MiB', 'GiB', 'TiB'][scale]! : declared || '';
  const format = (value: number) =>
    `${(value / (bytes ? 1024 ** scale : 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix ? ` ${suffix}` : ''}`;
  return {
    format,
    exact: (value: number) => (bytes ? `${format(value)} (${value.toLocaleString()} B)` : format(value))
  };
}
