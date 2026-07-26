/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorAppHierarchyNode } from '@/features/monitor';

import {
  isMetricAlertFieldIdentifier,
  metricAlertFieldTypes,
  metricAlertOperatorsForType,
  type MetricAlertField
} from './alert-rule-condition';
import type { RealtimeMetricTarget } from './alert-rule-metric-expression';
import { AlertRuleContractError } from './alert-rule-types';

export type MetricAlertTargetOption = {
  target: RealtimeMetricTarget;
  label: string;
  fields: MetricAlertField[];
};

export type MetricAlertTargetCatalog = {
  app: { value: string; label: string };
  targets: MetricAlertTargetOption[];
};

type MetricAlertCatalogLabels = {
  availability: string;
  rowCount: string;
};

const rowCountField = '__row__';

/**
 * Projects the Monitor feature's recursive wire contract into the smaller
 * target/field vocabulary owned by Alert Rule authoring.
 */
export function buildMetricAlertTargetCatalog(
  hierarchy: MonitorAppHierarchyNode,
  labels: MetricAlertCatalogLabels
): MetricAlertTargetCatalog {
  const app = hierarchy.value.trim();
  if (!app) throw contract('metric alert application is invalid');
  const metricValues = new Set<string>();
  const targets: MetricAlertTargetOption[] = [
    {
      target: { kind: 'availability', app },
      label: requiredLabel(labels.availability, 'availability'),
      fields: []
    }
  ];
  for (const metric of hierarchy.children) {
    const metricValue = metric.value.trim();
    if (!metricValue || metricValues.has(metricValue)) throw contract('metric alert target catalog is ambiguous');
    metricValues.add(metricValue);
    targets.push({
      target: { kind: 'metric', app, metric: metricValue },
      label: displayLabel(metric),
      fields: metricFields(metric, labels.rowCount)
    });
  }
  return {
    app: { value: app, label: displayLabel(hierarchy) },
    targets
  };
}

function metricFields(metric: MonitorAppHierarchyNode, rowCountLabel: string) {
  const values = new Set<string>();
  const fields: MetricAlertField[] = [];
  for (const field of metric.children) {
    const value = field.value.trim();
    if (values.has(value)) throw contract('metric alert field catalog is ambiguous');
    values.add(value);
    if (
      !isMetricAlertFieldIdentifier(value) ||
      field.type === null ||
      metricAlertOperatorsForType(field.type).length === 0
    ) {
      continue;
    }
    fields.push({
      value,
      label: displayLabel(field),
      type: field.type,
      unit: field.unit
    });
  }
  if (values.has(rowCountField)) throw contract('metric alert row-count field is ambiguous');
  fields.push({
    value: rowCountField,
    label: requiredLabel(rowCountLabel, 'row count'),
    type: metricAlertFieldTypes.number,
    unit: null
  });
  return fields;
}

function displayLabel(node: MonitorAppHierarchyNode) {
  return node.label?.trim() || node.value.trim();
}

function requiredLabel(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw contract(`${field} label is invalid`);
  return normalized;
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
