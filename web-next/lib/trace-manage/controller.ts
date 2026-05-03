import type { LogEntry, PageResult, TraceDetail, TraceSpanNode } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

export async function loadTraceDetailBundle(apiGet: ApiGetter, traceId: string): Promise<{
  detail: TraceDetail;
  spans: TraceSpanNode[];
}> {
  const [detail, spans] = await Promise.all([
    apiGet<TraceDetail>(`/traces/${encodeURIComponent(traceId)}`),
    apiGet<TraceSpanNode[]>(`/traces/${encodeURIComponent(traceId)}/spans`)
  ]);

  return { detail, spans };
}

export async function loadRelatedLogs(apiGet: ApiGetter, traceId: string): Promise<LogEntry[]> {
  const result = await apiGet<PageResult<LogEntry>>(`/logs/list?pageIndex=0&pageSize=5&traceId=${encodeURIComponent(traceId)}`);
  return result.content || [];
}
