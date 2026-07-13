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

export function parseLabelMatchers(value: string): Record<string, string> | null {
  const result: Record<string, string> = {};
  const matchers = value.split(/[\n,]+/).map(matcher => matcher.trim()).filter(Boolean);
  if (matchers.length === 0) return null;
  for (const matcher of matchers) {
    const separator = matcher.search(/[:=]/);
    const key = separator >= 0 ? matcher.slice(0, separator).trim() : '';
    const matcherValue = separator >= 0 ? matcher.slice(separator + 1).trim() : '';
    if (!key || !matcherValue) return null;
    result[key] = matcherValue;
  }
  return result;
}

export function formatLabelMatchers(labels?: Record<string, string>) {
  return Object.entries(labels ?? {}).map(([key, value]) => `${key}:${value}`).join(', ');
}
