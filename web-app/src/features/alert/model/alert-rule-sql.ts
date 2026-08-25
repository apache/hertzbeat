/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type AlertRuleSqlValidationCode =
  'selectOnly' | 'union' | 'intersect' | 'except' | 'subquery' | 'from' | 'table' | 'parentheses';

export type AlertRuleSqlCompletion = {
  label: string;
  insertText: string;
  detail: string;
  kind: 'class' | 'field' | 'keyword' | 'operator' | 'snippet';
  snippet?: boolean;
};

export const alertRuleLogTableName = 'hertzbeat_logs';

export const alertRuleLogTableColumns = [
  { name: 'time_unix_nano', type: 'TimestampNanosecond', description: 'Log timestamp in nanoseconds' },
  { name: 'observed_time_unix_nano', type: 'TimestampNanosecond', description: 'Observed timestamp in nanoseconds' },
  { name: 'severity_number', type: 'Int32', description: 'Severity level number (1-24)' },
  { name: 'severity_text', type: 'String', description: 'Severity text (DEBUG, INFO, WARN, ERROR, etc.)' },
  { name: 'body', type: 'Json', description: 'Log message body content' },
  { name: 'trace_id', type: 'String', description: 'Distributed tracing trace ID' },
  { name: 'span_id', type: 'String', description: 'Distributed tracing span ID' },
  { name: 'trace_flags', type: 'Int32', description: 'Trace flags' },
  { name: 'attributes', type: 'Json', description: 'Log attributes as JSON' },
  { name: 'resource', type: 'Json', description: 'Resource information as JSON' },
  { name: 'instrumentation_scope', type: 'Json', description: 'Instrumentation scope information' },
  { name: 'dropped_attributes_count', type: 'Int32', description: 'Number of dropped attributes' }
] as const;

const blockedSqlFeatures = [
  { code: 'union', pattern: /\bUNION\b/i },
  { code: 'intersect', pattern: /\bINTERSECT\b/i },
  { code: 'except', pattern: /\bEXCEPT\b/i }
] as const satisfies ReadonlyArray<{ code: AlertRuleSqlValidationCode; pattern: RegExp }>;

const columnsAsCompletions = alertRuleLogTableColumns.map<AlertRuleSqlCompletion>(column => ({
  label: column.name,
  insertText: column.name,
  detail: column.type,
  kind: 'field'
}));

/**
 * Returns the same context-sensitive completion catalog as the 1.8.0 editor.
 * The caller supplies only the text before the cursor so the logic stays
 * deterministic and independent of the editor implementation.
 */
export function getAlertRuleSqlCompletions(textBeforeCursor: string): AlertRuleSqlCompletion[] {
  const suggestions: AlertRuleSqlCompletion[] = [];
  const upperText = textBeforeCursor.toUpperCase();
  const isAfterFrom = /FROM\s+$/i.test(textBeforeCursor) || /FROM\s+\w*$/i.test(textBeforeCursor);
  const isAfterSelect = /SELECT\s+$/i.test(textBeforeCursor) || /SELECT\s+.*,\s*$/i.test(textBeforeCursor);
  const isAfterWhere =
    /WHERE\s+$/i.test(textBeforeCursor) || /AND\s+$/i.test(textBeforeCursor) || /OR\s+$/i.test(textBeforeCursor);
  const hasTableContext = new RegExp(alertRuleLogTableName, 'i').test(textBeforeCursor);

  if (!textBeforeCursor.trim()) {
    suggestions.push(
      {
        label: `SELECT * FROM ${alertRuleLogTableName}`,
        insertText: `SELECT * FROM ${alertRuleLogTableName} WHERE #{}`,
        detail: 'Query template',
        kind: 'snippet',
        snippet: true
      },
      {
        label: `SELECT COUNT(*) FROM ${alertRuleLogTableName}`,
        insertText: `SELECT COUNT(*) as count FROM ${alertRuleLogTableName} WHERE #{}`,
        detail: 'Count template',
        kind: 'snippet',
        snippet: true
      }
    );
  }

  if (isAfterFrom) {
    return [
      {
        label: alertRuleLogTableName,
        insertText: alertRuleLogTableName,
        detail: 'Log table',
        kind: 'class'
      }
    ];
  }

  if (isAfterSelect) {
    return [{ label: '*', insertText: '*', detail: 'All columns', kind: 'operator' }, ...columnsAsCompletions];
  }

  if (isAfterWhere || hasTableContext) suggestions.push(...columnsAsCompletions);
  suggestions.push(
    ...getContextKeywords(upperText).map<AlertRuleSqlCompletion>(keyword => ({
      label: keyword,
      insertText: keyword,
      detail: 'SQL',
      kind: 'keyword'
    }))
  );
  return suggestions;
}

/**
 * Mirrors the 1.8.0 editor's deterministic UX feedback. The backend remains
 * authoritative for SQL authorization and execution.
 */
export function validateAlertRuleSql(sql: string): AlertRuleSqlValidationCode[] {
  if (!sql.trim()) return [];
  const sanitized = removeStringsAndComments(sql);
  const upper = sanitized.toUpperCase().trim();

  if (!upper.startsWith('SELECT')) return ['selectOnly'];
  if (/\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i.test(sanitized)) {
    return ['selectOnly'];
  }
  const blockedFeature = blockedSqlFeatures.find(feature => feature.pattern.test(sanitized));
  if (blockedFeature) return [blockedFeature.code];
  if (/\(\s*SELECT\b/i.test(sanitized)) return ['subquery'];
  if (!/\bFROM\b/i.test(sanitized)) return ['from'];

  const errors: AlertRuleSqlValidationCode[] = [];
  const table = sanitized.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)?.[1];
  if (table && table.toLowerCase() !== alertRuleLogTableName) errors.push('table');
  if (hasMismatchedParentheses(sanitized)) errors.push('parentheses');
  return errors;
}

function hasMismatchedParentheses(sql: string) {
  return (sql.match(/\(/g)?.length ?? 0) !== (sql.match(/\)/g)?.length ?? 0);
}

function removeStringsAndComments(sql: string) {
  return sql
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function getContextKeywords(upperText: string) {
  if (!upperText.includes('SELECT')) return ['SELECT'];
  if (!upperText.includes('FROM')) return ['FROM'];
  if (!upperText.includes('WHERE')) return ['WHERE', 'ORDER BY', 'LIMIT', 'GROUP BY'];
  return ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'ORDER BY', 'LIMIT', 'GROUP BY'];
}
