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
