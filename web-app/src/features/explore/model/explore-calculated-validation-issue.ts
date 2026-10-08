/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
const knownValidationCodes = new Set([
  'invalid_expression',
  'unknown_reference',
  'dependency_cycle',
  'duplicate_output',
  'type_mismatch',
  'unsupported_function',
  'budget_exceeded',
  'invalid_pattern'
]);

export function validationError(errors: { path: string; code: string }[] | undefined) {
  const issue = errors?.[0];
  return issue && knownValidationCodes.has(issue.code) ? `validation.${issue.code}` : 'invalid';
}

export function validationPath(errors: { path: string; code: string }[] | undefined) {
  const path = errors?.[0]?.path ?? '';
  if (/^fields\[\d+\]\.expression$/.test(path)) return 'expression';
  if (/^fields\[\d+\]\.name$/.test(path)) return 'name';
  if (/^fields\[\d+\]\.pattern$/.test(path)) return 'pattern';
  if (/^fields\[\d+\]\.captures\[\d+\]\.name$/.test(path)) return 'capture';
  return undefined;
}
