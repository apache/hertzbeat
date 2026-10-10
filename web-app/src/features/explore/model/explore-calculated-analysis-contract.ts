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

export type CalculatedAnalysisResponse = {
  version: 1 | 2;
  window: { start: number; end: number };
  executed: {
    parameters: Record<string, string>;
    calculatedFields?: {
      version: 2;
      fields: Array<{
        id: string;
        kind: 'formula' | 'extraction';
        outputs: Array<{ name: string; type: 'number' | 'string' | 'boolean' }>;
      }>;
    };
    operation: {
      kind: 'analysis';
      view: 'groups' | 'timeseries';
      grouping: Array<{ field: string; limit: number }>;
      measure: { function: string; field: string } | null;
      limit: number;
      order: 'count-asc' | 'count-desc' | 'measure-asc' | 'measure-desc';
      minCount: number;
      intervalMs?: number | undefined;
    };
  };
  result: {
    kind: 'analysis';
    view: 'groups' | 'timeseries';
    matchingTotal: number;
    truncated: boolean;
    intervalMs: number | null;
    groups: Array<{
      keys: Array<{ field: string; kind: 'value' | 'null' | 'all'; value: string | number | boolean | null }>;
      count: number;
      measurement: { state: 'ready' | 'no_samples' | 'non_finite'; sampleCount: number; value: number | null } | null;
      buckets: Array<{
        start: number;
        count: number;
        measurement: { state: 'ready' | 'no_samples' | 'non_finite'; sampleCount: number; value: number | null } | null;
      }>;
    }>;
  };
};
