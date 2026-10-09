/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export function logSummary(body: unknown): string | undefined {
  if (typeof body === 'string') return body;
  if (body == null) return undefined;
  try {
    return JSON.stringify(body);
  } catch {
    return undefined;
  }
}
