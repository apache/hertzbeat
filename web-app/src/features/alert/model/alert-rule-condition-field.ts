/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
