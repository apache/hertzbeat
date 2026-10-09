/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { DEFAULT_TRACE_VIEW, encodeTraceView, readTraceView, type TraceView } from '../model/explore-trace-view';
import type { TraceExploreQuery } from '../model/explore-query';
export function useTraceView(query: TraceExploreQuery, onChange: (encoded: string) => void) {
  const [rejected, setRejected] = useState(false);
  const parsed = readTraceView(query.traceView);
  const publish = (next: TraceView) => {
    try {
      onChange(encodeTraceView(next));
      setRejected(false);
    } catch {
      setRejected(true);
    }
  };
  return {
    view: parsed ?? DEFAULT_TRACE_VIEW,
    invalid: parsed === undefined,
    rejected,
    onChange: publish,
    reset: () => publish(DEFAULT_TRACE_VIEW)
  };
}
