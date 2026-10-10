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

type ExpressionOperator = '&&' | 'or';

type ExpressionScanState = {
  depth: number;
  quote: '"' | "'" | null;
  escaped: boolean;
};

export function splitAlertRuleExpressionTopLevel(source: string, operator: ExpressionOperator): string[] | null {
  const result: string[] = [];
  let start = 0;
  const state = createExpressionScanState();
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    advanceExpressionScanState(state, char);
    if (state.depth < 0) return null;
    if (!isTopLevelOperator(source, operator, index, state)) continue;
    const item = source.slice(start, index).trim();
    if (!item) return null;
    result.push(item);
    index += operator.length - 1;
    start = index + 1;
  }
  if (state.quote || state.depth !== 0) return null;
  const finalItem = source.slice(start).trim();
  if (!finalItem) return null;
  result.push(finalItem);
  return result;
}

export function unwrapAlertRuleExpressionGroup(value: string) {
  const source = value.trim();
  if (!source.startsWith('(') || !source.endsWith(')')) return source;
  const state = createExpressionScanState();
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    advanceExpressionGroupState(state, char, source[index - 1]);
    if (state.depth === 0 && index < source.length - 1) return source;
  }
  return source.slice(1, -1).trim();
}

function createExpressionScanState(): ExpressionScanState {
  return { depth: 0, quote: null, escaped: false };
}

function advanceExpressionScanState(state: ExpressionScanState, char: string) {
  if (state.quote) {
    if (state.escaped) state.escaped = false;
    else if (char === '\\') state.escaped = true;
    else if (char === state.quote) state.quote = null;
    return;
  }
  if (char === '"' || char === "'") state.quote = char;
  else if (char === '(') state.depth += 1;
  else if (char === ')') state.depth -= 1;
}

function isTopLevelOperator(source: string, operator: ExpressionOperator, index: number, state: ExpressionScanState) {
  return (
    !state.quote &&
    state.depth === 0 &&
    source.startsWith(operator, index) &&
    hasOperatorBoundary(source, operator, index)
  );
}

function hasOperatorBoundary(source: string, operator: ExpressionOperator, index: number) {
  if (operator === '&&') return true;
  return /\s/.test(source[index - 1] ?? '') && /\s/.test(source[index + operator.length] ?? '');
}

function advanceExpressionGroupState(state: ExpressionScanState, char: string, previous: string | undefined) {
  if (state.quote) {
    if (char === state.quote && previous !== '\\') state.quote = null;
    return;
  }
  if (char === '"' || char === "'") state.quote = char;
  else if (char === '(') state.depth += 1;
  else if (char === ')') state.depth -= 1;
}
