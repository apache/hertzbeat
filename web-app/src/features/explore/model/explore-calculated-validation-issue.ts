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
