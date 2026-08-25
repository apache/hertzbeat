/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export function formatAgentTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}
