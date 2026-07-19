/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export function nextStructuredRowId(rows: Array<{ id: number }>) {
  return rows.reduce((maximum, row) => Math.max(maximum, row.id), -1) + 1;
}
