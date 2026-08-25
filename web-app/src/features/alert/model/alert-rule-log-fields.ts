/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { metricAlertFieldTypes, type MetricAlertField } from './alert-rule-condition';

export const logAlertFields: MetricAlertField[] = [
  field('log.timeUnixNano', 'Time (Unix Nano)', metricAlertFieldTypes.number, 'ns'),
  field('log.observedTimeUnixNano', 'Observed Time (Unix Nano)', metricAlertFieldTypes.number, 'ns'),
  field('log.severityNumber', 'Severity Number', metricAlertFieldTypes.number),
  field('log.severityText', 'Severity Text', metricAlertFieldTypes.string),
  field('log.body', 'Body', metricAlertFieldTypes.string),
  field('log.droppedAttributesCount', 'Dropped Attributes Count', metricAlertFieldTypes.number),
  field('log.traceId', 'Trace ID', metricAlertFieldTypes.string),
  field('log.spanId', 'Span ID', metricAlertFieldTypes.string),
  field('log.traceFlags', 'Trace Flags', metricAlertFieldTypes.number),
  field('log.attributes', 'Attributes', metricAlertFieldTypes.object, null, true),
  field('log.resource', 'Resource', metricAlertFieldTypes.object, null, true),
  field('log.instrumentationScope.name', 'Instrumentation Scope Name', metricAlertFieldTypes.string),
  field('log.instrumentationScope.version', 'Instrumentation Scope Version', metricAlertFieldTypes.string),
  field(
    'log.instrumentationScope.attributes',
    'Instrumentation Scope Attributes',
    metricAlertFieldTypes.object,
    null,
    true
  ),
  field(
    'log.instrumentationScope.droppedAttributesCount',
    'Instrumentation Scope Dropped Attributes Count',
    metricAlertFieldTypes.number
  )
];

function field(
  value: string,
  label: string,
  type: number,
  unit: string | null = null,
  acceptsAttribute = false
): MetricAlertField {
  return { value, label, type, unit, ...(acceptsAttribute ? { acceptsAttribute: true } : {}) };
}
