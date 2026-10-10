/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

type QueryToken = { from: number; end: number; raw: string; removable: boolean };
type TokenRemovalRange = { from: number; to: number };

type QueryOperator = { from: number; end: number; depth: number; value: 'AND' | 'OR' | 'NOT' };
type Parentheses = { open: number; close: number };

export function queryTokens(text: string): QueryToken[] {
  const tokens: QueryToken[] = [];
  for (let from = 0; from < text.length;) {
    if (/\s|[()[\]<>]/u.test(text[from]!)) {
      from++;
      continue;
    }
    const { end, valid } = scanQueryToken(text, from);
    const raw = text.slice(from, end);
    if (valid && !/^(?:AND|OR|NOT|TO|-)$/u.test(raw)) tokens.push({ from, end, raw, removable: !raw.endsWith(':') });
    from = end;
  }
  return tokens;
}

export function tokenRemovalRange(text: string, token: Pick<QueryToken, 'from' | 'end'>): TokenRemovalRange {
  const { operators, groups } = queryStructure(text);
  let from = token.from;
  let to = token.end;
  for (let pass = 0; pass < groups.length + 2; pass++) {
    const depth = nestingDepth(groups, from);
    let precedingNot = operators.find(
      operator =>
        operator.value === 'NOT' &&
        operator.depth === depth &&
        operator.end <= from &&
        onlyWhitespace(text, operator.end, from)
    );
    while (precedingNot) {
      from = precedingNot.from;
      precedingNot = operators.find(
        operator =>
          operator.value === 'NOT' &&
          operator.depth === depth &&
          operator.end <= from &&
          onlyWhitespace(text, operator.end, from)
      );
    }

    const currentDepth = nestingDepth(groups, from);
    const right = operators.find(
      operator =>
        (operator.value === 'AND' || operator.value === 'OR') &&
        operator.depth === currentDepth &&
        operator.from >= to &&
        onlyWhitespace(text, to, operator.from)
    );
    if (right) {
      to = consumeWhitespaceRight(text, right.end);
    } else {
      const left = [...operators]
        .reverse()
        .find(
          operator =>
            (operator.value === 'AND' || operator.value === 'OR') &&
            operator.depth === currentDepth &&
            operator.end <= from &&
            onlyWhitespace(text, operator.end, from)
        );
      if (left) from = left.from;
    }

    const emptyGroup = [...groups]
      .filter(group => group.open < from && to <= group.close)
      .sort((a, b) => b.open - a.open)
      .find(group => onlyWhitespace(text, group.open + 1, from) && onlyWhitespace(text, to, group.close));
    if (!emptyGroup) break;
    from = emptyGroup.open;
    to = emptyGroup.close + 1;
  }
  return { from, to };
}

function queryStructure(text: string) {
  const operators: QueryOperator[] = [];
  const groups: Parentheses[] = [];
  const opens: number[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (character === '\\') {
      index++;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === '(') {
      opens.push(index);
      continue;
    }
    if (character === ')') {
      const open = opens.pop();
      if (open !== undefined) groups.push({ open, close: index });
      continue;
    }
    if (!/[A-Za-z]/u.test(character) || (index > 0 && /[\w-]/u.test(text[index - 1]!))) continue;
    const match = /^(AND|OR|NOT)\b/iu.exec(text.slice(index));
    if (!match) continue;
    const value = match[0].toUpperCase() as QueryOperator['value'];
    operators.push({ from: index, end: index + match[0].length, depth: opens.length, value });
    index += match[0].length - 1;
  }
  return { operators, groups };
}

function nestingDepth(groups: Parentheses[], position: number) {
  return groups.filter(group => group.open < position && position < group.close).length;
}

function onlyWhitespace(text: string, from: number, to: number) {
  return from <= to && /^\s*$/u.test(text.slice(from, to));
}

function consumeWhitespaceRight(text: string, position: number) {
  while (/\s/u.test(text[position] ?? '') && position < text.length) position++;
  return position;
}

type TokenSpan = { end: number; valid: boolean };

function scanQueryToken(text: string, from: number): TokenSpan {
  const calculated = scanCalculatedToken(text, from);
  if (calculated) return calculated;
  const group = scanGroupedCondition(text, from);
  if (group) return group;
  const bracket = scanBracketCondition(text, from);
  if (bracket) return bracket;
  let end = from;
  while (end < text.length && !/\s|[()[\]<>]/u.test(text[end]!)) {
    if (text[end] === '\\') {
      end += 2;
      continue;
    }
    if (text[end] === '"') {
      const quoted = closingQuote(text, end);
      return { end: quoted < 0 ? text.length : quoted, valid: (end === from || text[end - 1] === ':') && quoted > 0 };
    }
    end++;
  }
  return { end, valid: end <= text.length };
}

function scanGroupedCondition(text: string, from: number): TokenSpan | null {
  const field = /^-?(?:\*|@[\w.-]+|resource\.[\w.-]+|[\w.-]+):\(/u.exec(text.slice(from));
  if (!field) return null;
  let depth = 1;
  let quoted = false;
  for (let i = from + field[0].length; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '"') quoted = !quoted;
    else if (!quoted && text[i] === '(') depth++;
    else if (!quoted && text[i] === ')' && --depth === 0) return { end: i + 1, valid: true };
  }
  return { end: text.length, valid: false };
}

function scanCalculatedToken(text: string, from: number): TokenSpan | null {
  const field = /^#[A-Za-z][A-Za-z0-9_]{0,63}:/u.exec(text.slice(from));
  if (!field) return null;
  let end = from + field[0].length;
  while (end < text.length && !/\s|[()]/u.test(text[end]!)) {
    if (text[end] === '"') {
      const quoted = closingQuote(text, end);
      if (quoted < 0) return { end: text.length, valid: false };
      end = quoted;
    } else end++;
  }
  return { end, valid: end > from + field[0].length };
}

function scanBracketCondition(text: string, from: number): TokenSpan | null {
  const field = /^-?(?:\*|@[\w.-]+|resource\.[\w.-]+|[\w.-]+)/u.exec(text.slice(from));
  if (!field) return null;
  let end = from + field[0].length;
  if (text[end] !== '[' && !(text[end] === ':' && text[end + 1] === '[')) return null;
  while (text[end] === '[') {
    end = closingBracket(text, end);
    if (end < 0) return { end: text.length, valid: false };
  }
  if (text[end] !== ':') return { end, valid: false };
  end++;
  if (text[end] === '[') {
    end = closingBracket(text, end);
    return { end: end < 0 ? text.length : end, valid: end > 0 };
  }
  const value = scanQueryToken(text, end);
  return { end: value.end, valid: value.valid && value.end > end };
}

function closingBracket(text: string, opening: number) {
  let quoted = false;
  for (let i = opening + 1; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '"') quoted = !quoted;
    else if (text[i] === ']' && !quoted) return i + 1;
  }
  return -1;
}

function closingQuote(text: string, opening: number) {
  for (let i = opening + 1; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '"') return i + 1;
  }
  return -1;
}
