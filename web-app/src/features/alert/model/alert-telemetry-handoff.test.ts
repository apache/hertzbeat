/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { AlertRecord } from './alert-model';
import { alertTelemetryHandoffs } from './alert-telemetry-handoff';

describe('alert telemetry handoff', () => {
  it('rejects missing, conflicting, or control-bearing service scope', () => {
    expect(alertTelemetryHandoffs(alert({ alertname: 'CPU' }))).toEqual([]);
    expect(alertTelemetryHandoffs(alert({ service: 'checkout', serviceName: 'payments' }))).toEqual([]);
    expect(alertTelemetryHandoffs(alert({ 'service.name': 'checkout\nprivate' }))).toEqual([]);
    expect(
      alertTelemetryHandoffs(
        alert({ 'service.name': 'checkout', serviceNamespace: 'commerce', service_namespace: 'finance' })
      )
    ).toEqual([]);
  });

  it('prefers the standard OTLP key over a legacy service alias', () => {
    const paths = alertTelemetryHandoffs(alert({ 'service.name': 'checkout', instance: 'checkout-1' }));

    expect(paths[0]?.path).toContain('serviceName=checkout');
    expect(paths[0]?.path).not.toContain('checkout-1');
  });

  it('retains a safe exact service scope when timestamps are unavailable', () => {
    const paths = alertTelemetryHandoffs(
      alert({
        'service.name': ' checkout ',
        'service.namespace': 'commerce',
        'deployment.environment.name': 'prod'
      })
    );

    expect(paths).toHaveLength(3);
    expect(paths[1]?.path).toBe(
      '/explore?signal=logs&timeRange=last-30m&serviceName=checkout&serviceNamespace=commerce&environment=prod'
    );
  });
});

function alert(labels: Record<string, string>): AlertRecord {
  return {
    id: 11,
    labels,
    annotations: null,
    content: null,
    status: 'firing',
    triggerTimes: null,
    startAt: null,
    activeAt: null,
    endAt: null
  };
}
