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
    const session = new AlertRealtimeSession(refresh, onAlert);
    session.connect();
    return () => session.close();
  }, [onAlert, refresh]);
}

class CoalescedAlertRefresh {
  private closed = false;
  private running = false;
  private trailing = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly refresh: () => Promise<unknown>) {}

  schedule = () => {
    if (this.closed) return;
    if (this.running) {
      this.trailing = true;
      return;
    }
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run();
    }, alertRefreshCoalesceMs);
  };

  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private async run() {
    if (this.closed || this.running) return;
    this.running = true;
    try {
      await this.refresh();
    } catch {
      // Existing list and summary states already expose honest request
      // failures. The stream must not create a second competing error owner.
    } finally {
      this.running = false;
      if (this.trailing && !this.closed) {
        this.trailing = false;
        this.schedule();
      }
    }
  }
}

class AlertRealtimeSession {
  private closed = false;
  private fallbackTimer: ReturnType<typeof setInterval> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private stream: { close: () => void } | undefined;
  private streamGeneration = 0;
  private readonly refreshScheduler: CoalescedAlertRefresh;

  constructor(
    refresh: () => Promise<unknown>,
    private readonly onAlert?: (event: AlertEventSignal | null) => void
  ) {
    this.refreshScheduler = new CoalescedAlertRefresh(refresh);
  }

  connect = () => {
    if (this.closed) return;
    this.stopReconnect();
    this.stream?.close();
    this.stream = undefined;
    const generation = ++this.streamGeneration;
    const ownsConnection = () => this.ownsConnection(generation);
    try {
      this.stream = openAlertGroupStream({
        onOpen: () => this.handleOpen(ownsConnection),
        onAlert: event => this.handleAlert(ownsConnection, event),
        onMutation: () => this.handleMutation(ownsConnection),
        onRetrying: () => undefined,
        onUnavailable: () => this.handleUnavailable(ownsConnection)
      });
    } catch {
      if (!ownsConnection()) return;
      this.startFallback();
      this.scheduleReconnect();
    }
  };

  close() {
    this.closed = true;
    this.refreshScheduler.close();
    this.stopFallback();
    this.stopReconnect();
    this.stream?.close();
  }

  private ownsConnection(generation: number) {
    return !this.closed && generation === this.streamGeneration;
  }

  private handleOpen(ownsConnection: () => boolean) {
    if (!ownsConnection()) return;
    this.refreshScheduler.schedule();
    this.stopFallback();
    this.stopReconnect();
  }

  private handleAlert(ownsConnection: () => boolean, event: AlertEventSignal | null) {
    if (!ownsConnection()) return;
    this.onAlert?.(event);
    this.refreshScheduler.schedule();
  }

  private handleMutation(ownsConnection: () => boolean) {
    if (ownsConnection()) this.refreshScheduler.schedule();
  }

  private handleUnavailable(ownsConnection: () => boolean) {
    if (!ownsConnection()) return;
    this.streamGeneration += 1;
    const exhausted = this.stream;
    this.stream = undefined;
    exhausted?.close();
    this.startFallback();
    this.scheduleReconnect();
  }

  private startFallback() {
    this.refreshScheduler.schedule();
    if (!this.fallbackTimer) {
      this.fallbackTimer = setInterval(this.refreshScheduler.schedule, alertFallbackPollingMs);
    }
  }

  private stopFallback() {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = undefined;
  }

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, alertStreamCircuitBreakerMs);
  }

  private stopReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }
}
