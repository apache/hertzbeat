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

import type { JsonValue } from '../model/explore-signal-contract';
export type Node = { key: string; path: string[]; value: JsonValue; children?: Node[] };
export function makeNodes(value: JsonValue, path: string[] = []): Node[] {
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).map(([name, child]) => {
    const next = [...path, name];
    return {
      key: JSON.stringify(next),
      path: next,
      value: child,
      ...(child !== null && typeof child === 'object' ? { children: makeNodes(child, next) } : {})
    };
  });
}

export function walk(nodes: Node[]): Node[] {
  return nodes.flatMap(node => [node, ...walk(node.children ?? [])]);
}

export function typeLabel(value: JsonValue) {
  if (value === null) return '';
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === 'object') return 'object';
  return typeof value;
}

export function highlight(value: string, query: string) {
  if (!query) return value;
  const start = value.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (start < 0) return value;
  return (
    <>
      {value.slice(0, start)}
      <mark>{value.slice(start, start + query.length)}</mark>
      {value.slice(start + query.length)}
    </>
  );
}
