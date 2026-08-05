/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  EntityNoiseControlRule,
  EntityNoiseControlSummary,
  EntityUnifiedEvidence
} from '../model/entity-contract';

type UnifiedEvidenceWire = {
  activeSignalCount: number;
  activeSignals: string[];
  metricsActive: boolean;
  logsActive: boolean;
  tracesActive: boolean;
  metricEvidenceCount: number;
  logEvidenceCount: number;
  traceEvidenceCount: number;
  latestObservedAt?: number | null | undefined;
  evidenceSources: Array<{
    source: 'monitor' | 'otlp';
    metricEvidenceCount: number;
    logEvidenceCount: number;
    traceEvidenceCount: number;
    latestObservedAt?: number | null | undefined;
  }>;
};

type NoiseControlRuleWire = Omit<EntityNoiseControlRule, 'updatedAt'> & { updatedAt?: number | null | undefined };
type NoiseControlSummaryWire = Omit<EntityNoiseControlSummary, 'activeSilences' | 'matchingInhibits'> & {
  activeSilences: NoiseControlRuleWire[];
  matchingInhibits: NoiseControlRuleWire[];
};

export function mapEntityUnifiedEvidence(value: UnifiedEvidenceWire): EntityUnifiedEvidence {
  return {
    activeSignalCount: value.activeSignalCount,
    activeSignals: [...value.activeSignals],
    active: { metrics: value.metricsActive, logs: value.logsActive, traces: value.tracesActive },
    totals: {
      metrics: value.metricEvidenceCount,
      logs: value.logEvidenceCount,
      traces: value.traceEvidenceCount
    },
    ...(value.latestObservedAt == null ? {} : { lastObservedAt: value.latestObservedAt }),
    sources: value.evidenceSources.map(source => ({
      source: source.source,
      metrics: source.metricEvidenceCount,
      logs: source.logEvidenceCount,
      traces: source.traceEvidenceCount,
      ...(source.latestObservedAt == null ? {} : { lastObservedAt: source.latestObservedAt })
    }))
  };
}

export function mapEntityNoiseControlSummary(value: NoiseControlSummaryWire): EntityNoiseControlSummary {
  return {
    ...value,
    activeSilences: value.activeSilences.map(cleanNoiseControlRule),
    matchingInhibits: value.matchingInhibits.map(cleanNoiseControlRule)
  };
}

function cleanNoiseControlRule(rule: NoiseControlRuleWire): EntityNoiseControlRule {
  const { updatedAt, ...required } = rule;
  return { ...required, ...(updatedAt == null ? {} : { updatedAt }) };
}
