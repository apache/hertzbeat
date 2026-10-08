/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
export type LogFilterFailureReason =
  'full_text_unsupported' | 'cidr_unsupported' | 'nested_path_unsupported' | 'group_selection_unsupported';

export type LogSyntaxDiagnostic = {
  issue: 'missing_value' | 'unclosed_group' | 'incomplete_range' | 'unclosed_quote' | 'unexpected_token';
  start: number;
  end: number;
  expression: string;
};

function logFilterFailureMessage(reason: LogFilterFailureReason | undefined, diagnostic?: LogSyntaxDiagnostic) {
  if (diagnostic) return `explore.logAuthoring.syntaxIssue.${diagnostic.issue}`;
  return reason ? `explore.logAuthoring.${reason}` : 'explore.logQueryBuilder.invalidFilter';
}

export function logFilterFailureDescription(
  t: TFunction,
  reason: LogFilterFailureReason | undefined,
  diagnostic?: LogSyntaxDiagnostic
) {
  const message = t(logFilterFailureMessage(reason, diagnostic));
  return diagnostic
    ? t('explore.logAuthoring.syntaxIssueAt', { position: diagnostic.start + 1, issue: message })
    : message;
}
