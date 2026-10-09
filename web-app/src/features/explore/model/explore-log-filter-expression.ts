/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const LOG_FILTER_OPERATORS = [
  '=',
  '!=',
  'IN',
  'NOT IN',
  'CONTAINS',
  'NOT CONTAINS',
  'EXISTS',
  'NOT EXISTS'
] as const;

export type LogFilterOperator = (typeof LOG_FILTER_OPERATORS)[number];

export type LogFilterClause = {
  field: string;
  operator: LogFilterOperator;
  value: string;
};

export type LogFilterParseResult = { valid: true; clauses: LogFilterClause[] } | { valid: false; raw: string };

const FIELD_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const WORD_OPERATORS = ['NOT CONTAINS', 'NOT EXISTS', 'NOT IN', 'CONTAINS', 'EXISTS', 'IN'] as const;
const VALUELESS_OPERATORS = new Set<LogFilterOperator>(['EXISTS', 'NOT EXISTS']);
type Quote = '"' | "'";
type ScanResult = { quote: Quote | undefined; depth: number; delimiterLength?: number; invalid?: boolean };

export function parseLogFilterExpression(raw: string): LogFilterParseResult {
  if (!raw.trim()) return { valid: true, clauses: [] };

  const segments = splitClauses(raw);
  if (!segments) return { valid: false, raw };

  const clauses: LogFilterClause[] = [];
  const fields = new Set<string>();
  for (const segment of segments) {
    const clause = parseClause(segment);
    if (!clause || fields.has(clause.field)) return { valid: false, raw };
    fields.add(clause.field);
    clauses.push(clause);
  }
  return { valid: true, clauses };
}

export function serializeLogFilterExpression(clauses: LogFilterClause[]): string | undefined {
  if (!clauses.length) return undefined;
  const serialized: string[] = [];
  for (const clause of clauses) {
    if (!FIELD_PATTERN.test(clause.field)) return undefined;
    if (VALUELESS_OPERATORS.has(clause.operator)) {
      serialized.push(`${clause.field} ${clause.operator}`);
      continue;
    }
    const value = clause.value?.trim();
    if (!value || !isValidValue(clause.operator, value)) return undefined;
    serialized.push(`${clause.field} ${clause.operator} ${value}`);
  }
  return serialized.join(' AND ');
}

function splitClauses(raw: string): string[] | undefined {
  const segments: string[] = [];
  let start = 0;
  let quote: Quote | undefined;
  let depth = 0;

  const pushSegment = (end: number) => {
    const segment = raw.slice(start, end).trim();
    if (!segment) return false;
    segments.push(segment);
    return true;
  };

  for (let index = 0; index < raw.length; index += 1) {
    const scanned = scanCharacter(raw, index, quote, depth);
    if (scanned.invalid) return undefined;
    quote = scanned.quote;
    depth = scanned.depth;
    if (scanned.delimiterLength) {
      if (!pushSegment(index)) return undefined;
      index += scanned.delimiterLength - 1;
      start = index + 1;
    }
  }

  if (quote || depth !== 0 || !pushSegment(raw.length)) return undefined;
  return segments;
}

function scanCharacter(raw: string, index: number, quote: Quote | undefined, depth: number): ScanResult {
  const character = raw.charAt(index);
  if (quote) {
    return { quote: character === quote && !escapedAt(raw, index) ? undefined : quote, depth };
  }
  if (character === '"' || character === "'") return { quote: character, depth };
  if (character === '(') return { quote, depth: depth + 1 };
  if (character === ')') return depth > 0 ? { quote, depth: depth - 1 } : { quote, depth, invalid: true };
  if (depth !== 0) return { quote, depth };
  if (character === ',') return { quote, depth, delimiterLength: 1 };
  const andSeparator = matchAndSeparator(raw, index);
  return andSeparator ? { quote, depth, delimiterLength: andSeparator.length } : { quote, depth };
}

function matchAndSeparator(raw: string, index: number) {
  if (!/\s/.test(raw.charAt(index))) return undefined;
  return /^\s+and(?:\s+|$)/i.exec(raw.slice(index))?.[0];
}

function parseClause(segment: string): LogFilterClause | undefined {
  const fieldMatch = /^([A-Za-z0-9_.:-]+)(.*)$/.exec(segment);
  if (!fieldMatch) return undefined;
  const field = fieldMatch[1];
  const remainder = fieldMatch[2];
  if (!field || remainder === undefined) return undefined;
  const expression = remainder.trimStart();
  return parseWordClause(field, expression) ?? parseSymbolicClause(field, expression);
}

function parseWordClause(field: string, expression: string): LogFilterClause | undefined {
  for (const operator of WORD_OPERATORS) {
    const operatorPattern = new RegExp(`^${operator.replace(' ', '\\s+')}($|\\s)`, 'i');
    const operatorMatch = operatorPattern.exec(expression);
    if (!operatorMatch) continue;
    const matchedOperator = operatorMatch[0];
    if (!matchedOperator) continue;
    const normalizedOperator: LogFilterOperator = operator;
    const value = expression.slice(matchedOperator.length).trim();
    if (VALUELESS_OPERATORS.has(normalizedOperator)) {
      return value ? undefined : { field, operator: normalizedOperator, value: '' };
    }
    return value && isValidValue(normalizedOperator, value)
      ? { field, operator: normalizedOperator, value }
      : undefined;
  }
  return undefined;
}

function parseSymbolicClause(field: string, expression: string): LogFilterClause | undefined {
  const symbolicMatch = /^(=|!=)\s*(.+)$/.exec(expression);
  if (!symbolicMatch) return undefined;
  const operator = symbolicMatch[1];
  const rawValue = symbolicMatch[2];
  if ((operator !== '=' && operator !== '!=') || rawValue === undefined) return undefined;
  const value = rawValue.trim();
  return isValidValue(operator, value) ? { field, operator, value } : undefined;
}

function isValidValue(operator: LogFilterOperator, value: string) {
  if (!value || !hasBalancedQuotes(value)) return false;
  if (operator === 'IN' || operator === 'NOT IN') return isValidList(value);
  return !hasUnquotedDelimiter(value);
}

function isValidList(value: string) {
  if (!value.startsWith('(') || !value.endsWith(')')) return false;
  const inner = value.slice(1, -1);
  if (!inner.trim()) return false;
  return splitListItems(inner)?.every(item => Boolean(item.trim()) && hasBalancedQuotes(item)) ?? false;
}

function splitListItems(value: string): string[] | undefined {
  const items: string[] = [];
  let start = 0;
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && !escapedAt(value, index)) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === ',') {
      const item = value.slice(start, index).trim();
      if (!item) return undefined;
      items.push(item);
      start = index + 1;
    }
  }
  if (quote) return undefined;
  const finalItem = value.slice(start).trim();
  if (!finalItem) return undefined;
  items.push(finalItem);
  return items;
}

function hasBalancedQuotes(value: string) {
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && !escapedAt(value, index)) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    }
  }
  return !quote;
}

function hasUnquotedDelimiter(value: string) {
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && !escapedAt(value, index)) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === ',' || character === '(' || character === ')') return true;
  }
  return false;
}

function escapedAt(value: string, index: number) {
  let backslashes = 0;
  for (let position = index - 1; position >= 0 && value[position] === '\\'; position -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}
