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

import type { MetricAlertField } from './alert-rule-condition-contract';

const attributePattern = /^[A-Za-z_][A-Za-z0-9_.]*$/;

export type ResolvedMetricAlertField = {
  field: MetricAlertField;
  source: string;
  attribute: string | null;
};

export function resolveMetricAlertFieldSource(
  fields: Map<string, MetricAlertField>,
  source: string
): ResolvedMetricAlertField | null {
  const exact = fields.get(source);
  if (exact) return { field: exact, source: exact.value, attribute: null };

  let resolved: ResolvedMetricAlertField | null = null;
  for (const field of fields.values()) {
    if (!field.acceptsAttribute || !source.startsWith(`${field.value}.`)) continue;
    const attribute = source.slice(field.value.length + 1);
    if (!attributePattern.test(attribute)) continue;
    if (!resolved || field.value.length > resolved.field.value.length) {
      resolved = { field, source, attribute };
    }
  }
  return resolved;
}

export function isMetricAlertAttribute(value: string) {
  return attributePattern.test(value);
}
