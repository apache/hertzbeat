/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';
import { logSyntaxDiagnostic } from './explore-log-syntax-diagnostic';
import { apiMessageGet } from '@/core/http/api-message';
import { openBrowserEventStream } from '@/core/http/event-stream';
import { classifyExploreSignalError, logFilterFailureReason } from './explore-signal-api-model';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { parseLiveLogRow, parseLogStreamGap } from './explore-log-schema';

export function openLogStream(
  path: string,
  handlers: {
    onOpen: () => void;
    onLog: (row: ReturnType<typeof parseLiveLogRow>) => void;
    onGap: (gap: ReturnType<typeof parseLogStreamGap>) => void;
    onRetrying: () => void;
    onUnavailable: () => void;
    onContractError: () => void;
    onInvalidFilter?: (
      reason?: import('../model/explore-log-filter-failure').LogFilterFailureReason,
      diagnostic?: LogSyntaxDiagnostic
    ) => void;
    onPermission?: () => void;
  }
) {
  let closed = false;
  let source: { close: () => void } | undefined;
  const controller = new AbortController();
  const validationPath = `/api/logs/sse/validate${path.includes('?') ? path.slice(path.indexOf('?')) : ''}`;
  void apiMessageGet(validationPath, { signal: controller.signal, preserveErrorEnvelope: true })
    .then(() => {
      if (closed) return;
      source = openBrowserEventStream(path, {
        eventNames: ['LOG_EVENT', 'LOG_STREAM_GAP'],
        onOpen: handlers.onOpen,
        onRetrying: handlers.onRetrying,
        onUnavailable: handlers.onUnavailable,
        onEvent: (name, data) => {
          try {
            const value = JSON.parse(data) as unknown;
            if (name === 'LOG_STREAM_GAP') handlers.onGap(parseLogStreamGap(value));
            else handlers.onLog(parseLiveLogRow(value));
          } catch (error) {
            if (error instanceof ExploreSignalContractError || error instanceof SyntaxError) {
              handlers.onContractError();
              return;
            }
            throw error;
          }
        }
      });
      if (closed) source.close();
    })
    .catch(error => {
      if (closed) return;
      reportPreflightFailure(error, path, handlers);
    });
  return {
    close: () => {
      closed = true;
      controller.abort();
      source?.close();
    }
  };
}

function reportPreflightFailure(error: unknown, path: string, handlers: Parameters<typeof openLogStream>[1]) {
  const kind = classifyExploreSignalError(error);
  if (kind === 'invalid_filter') {
    const params = new URLSearchParams(path.slice(path.indexOf('?') + 1));
    const diagnostic = logSyntaxDiagnostic(
      error,
      params.get('logContent') ?? '',
      params.get('searchSyntax') ?? undefined
    );
    const reject = handlers.onInvalidFilter ?? handlers.onUnavailable;
    if (diagnostic) reject(logFilterFailureReason(error), diagnostic);
    else reject(logFilterFailureReason(error));
  } else if (kind === 'permission') (handlers.onPermission ?? handlers.onUnavailable)();
  else handlers.onUnavailable();
}
