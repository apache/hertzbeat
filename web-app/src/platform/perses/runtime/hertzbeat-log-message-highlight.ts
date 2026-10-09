/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
