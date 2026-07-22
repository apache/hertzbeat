/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { RemotePageState } from '@/shared/remote-state';

export const alertRuleTypes = [
  'realtime_metric',
  'periodic_metric',
  'realtime_log',
  'periodic_log',
  'periodic_trace'
] as const;

export type AlertRuleKind = 'realtime' | 'periodic';
export type AlertRuleDataType = 'metric' | 'log' | 'trace';
export type AlertRuleType = (typeof alertRuleTypes)[number];
export type AlertRuleDatasource = 'promql' | 'sql';

export type AlertRule = {
  id: number;
  name: string;
  type: AlertRuleType | null;
  datasource: AlertRuleDatasource | null;
  expr: string | null;
  period: number | null;
  times: number | null;
  labels: Record<string, string> | null;
  annotations: Record<string, string> | null;
  template: string | null;
  enable: boolean;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertRulePage = {
  content: AlertRule[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type AlertRuleListState = RemotePageState<AlertRule, 'unavailable' | 'error'>;
export type AlertRuleFailureKind = 'missing' | 'unavailable' | 'error';
export type AlertRuleWriteOutcome = 'rejected' | 'uncertain';

export class AlertRuleContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertRuleContractError';
  }
}

export class AlertRuleMissingError extends Error {
  constructor() {
    super('Alert Rule detail is missing');
    this.name = 'AlertRuleMissingError';
  }
}

/** Stable source evidence that keeps transport details outside controllers. */
export class AlertRuleRequestFailure extends Error {
  constructor(
    readonly kind: AlertRuleFailureKind,
    readonly writeOutcome: AlertRuleWriteOutcome
  ) {
    super('Alert Rule request failed');
    this.name = 'AlertRuleRequestFailure';
  }
}

export function alertRuleFailureKind(error: unknown): AlertRuleFailureKind {
  if (error instanceof AlertRuleMissingError) return 'missing';
  return error instanceof AlertRuleRequestFailure ? error.kind : 'error';
}

/** Unknown write outcomes must continue through canonical read proof. */
export function alertRuleWriteOutcome(error: unknown): AlertRuleWriteOutcome {
  if (error instanceof AlertRuleContractError) return 'rejected';
  return error instanceof AlertRuleRequestFailure ? error.writeOutcome : 'uncertain';
}
