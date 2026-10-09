/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { apiMessageGet } from '@/core/http/api-message';
import { parseTraceStructureAnalysis } from '../model/explore-trace-structure-analysis';
export { parseTraceStructureAnalysis } from '../model/explore-trace-structure-analysis';

export async function loadTraceStructureAnalysis(path: string, signal?: AbortSignal) {
  return parseTraceStructureAnalysis(
    await apiMessageGet(path, { ...(signal ? { signal } : {}), preserveErrorEnvelope: true })
  );
}
