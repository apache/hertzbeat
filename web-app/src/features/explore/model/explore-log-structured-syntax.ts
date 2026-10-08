/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export function isStructuredLogSyntax(value: string | undefined) {
  return value === 'structured-v1' || value === 'structured-v2';
}
