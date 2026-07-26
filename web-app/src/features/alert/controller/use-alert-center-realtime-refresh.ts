/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

import { openAlertGroupStream } from '../api/alert-api';
import type { AlertEventSignal } from '../api/alert-event-schema';

const alertRefreshCoalesceMs = 250;
const alertFallbackPollingMs = 30_000;

export function useAlertCenterRealtimeRefresh(
  refresh: () => Promise<unknown>,
  onAlert?: (event: AlertEventSignal | null) => void
) {
  useEffect(() => {
    let closed = false;
    let running = false;
    let trailing = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;

    const scheduleRefresh = () => {
      if (closed) return;
      if (running) {
        trailing = true;
        return;
      }
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void runRefresh();
      }, alertRefreshCoalesceMs);
    };
    const runRefresh = async () => {
      if (closed || running) return;
      running = true;
      try {
        await refresh();
      } catch {
        // Existing list and summary states already expose honest request
        // failures. The stream must not create a second competing error owner.
      } finally {
        running = false;
        if (trailing && !closed) {
          trailing = false;
          scheduleRefresh();
        }
      }
    };
    const stopFallback = () => {
      if (fallbackTimer) clearInterval(fallbackTimer);
      fallbackTimer = undefined;
    };
    const startFallback = () => {
      scheduleRefresh();
      if (!fallbackTimer) fallbackTimer = setInterval(scheduleRefresh, alertFallbackPollingMs);
    };

    const stream = connectAlertStream(stopFallback, startFallback, scheduleRefresh, onAlert);

    return () => {
      closed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      stopFallback();
      stream?.close();
    };
  }, [onAlert, refresh]);
}

function connectAlertStream(
  stopFallback: () => void,
  startFallback: () => void,
  scheduleRefresh: () => void,
  onAlert?: (event: AlertEventSignal | null) => void
) {
  try {
    return openAlertGroupStream({
      onOpen: stopFallback,
      onAlert: event => {
        onAlert?.(event);
        scheduleRefresh();
      },
      onRetrying: () => undefined,
      onUnavailable: startFallback
    });
  } catch {
    startFallback();
    return undefined;
  }
}
