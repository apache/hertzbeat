/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { CollectorRecord } from './collector-model';

export type CollectorKind = 'embedded_java' | 'java' | 'hybrid';

/**
 * Classifies a registered Collector from explicit Hybrid evidence instead of
 * its name. A fresh managed-runtime report is authoritative. A persisted
 * Collector-owned gateway advertisement keeps an offline Hybrid Collector
 * recognizable while its heartbeat is unavailable.
 */
export function classifyCollectorKind(record: CollectorRecord): CollectorKind {
  // The protected main Collector is the in-process Java implementation. Its
  // identity takes precedence over any stale or invalid optional OTLP state.
  if (record.immutable) return 'embedded_java';
  if (record.runtimeReport?.enabled) return 'hybrid';
  const intake = record.instrumentationIntake;
  if (intake.status === 'available') return intake.gateway === 'collector' ? 'hybrid' : 'java';
  return intake.errorCode === 'intake_advertisement_invalid' || intake.errorCode === 'intake_advertisement_unavailable'
    ? 'hybrid'
    : 'java';
}
