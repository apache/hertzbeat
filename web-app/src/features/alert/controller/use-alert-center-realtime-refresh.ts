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
// Rebuild the stream at low frequency after its bounded retry budget is exhausted,
// so a transient outage cannot strand the shell in permanent polling.
const alertStreamCircuitBreakerMs = 5 * 60_000;

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
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stream: { close: () => void } | undefined;
    let streamGeneration = 0;

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
    const stopReconnect = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    };
    const scheduleReconnect = () => {
      if (closed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connectStream();
      }, alertStreamCircuitBreakerMs);
    };
    const connectStream = () => {
      if (closed) return;
      stopReconnect();
      stream?.close();
      stream = undefined;
      const generation = ++streamGeneration;
      const ownsConnection = () => !closed && generation === streamGeneration;
      try {
        stream = openAlertGroupStream({
          onOpen: () => {
            if (!ownsConnection()) return;
            scheduleRefresh();
            stopFallback();
            stopReconnect();
          },
          onAlert: event => {
            if (!ownsConnection()) return;
            onAlert?.(event);
            scheduleRefresh();
          },
          onMutation: () => {
            if (!ownsConnection()) return;
            scheduleRefresh();
          },
          onRetrying: () => undefined,
          onUnavailable: () => {
            if (!ownsConnection()) return;
            streamGeneration += 1;
            const exhausted = stream;
            stream = undefined;
            exhausted?.close();
            startFallback();
            scheduleReconnect();
          }
        });
      } catch {
        if (!ownsConnection()) return;
        startFallback();
        scheduleReconnect();
      }
    };

    connectStream();

    return () => {
      closed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      stopFallback();
      stopReconnect();
      stream?.close();
    };
  }, [onAlert, refresh]);
}
