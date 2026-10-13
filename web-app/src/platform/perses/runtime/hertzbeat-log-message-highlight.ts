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

const highlightName = 'hertzbeat-log-search';

/** Use native ranges so virtualized React message nodes and copy text stay untouched. */
export function highlightLogMessages(root: HTMLElement, search: string | undefined): () => void {
  if (!search || typeof Highlight === 'undefined' || !globalThis.CSS?.highlights) return () => {};
  const highlight = CSS.highlights.get(highlightName) ?? new Highlight();
  const ranges: Range[] = [];
  const literal = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
  for (const message of root.querySelectorAll('[data-log-index] > div:first-child > div:last-of-type p')) {
    const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? '';
      for (const match of text.matchAll(literal)) {
        const range = new Range();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push(range);
        highlight.add(range);
      }
      node = walker.nextNode();
    }
  }
  if (ranges.length > 0) CSS.highlights.set(highlightName, highlight);
  return () => {
    ranges.forEach(range => highlight.delete(range));
    if (highlight.size === 0 && CSS.highlights.get(highlightName) === highlight) CSS.highlights.delete(highlightName);
  };
}
