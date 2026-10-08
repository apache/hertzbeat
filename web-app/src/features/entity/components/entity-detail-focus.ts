/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export function focusEntityDetailChapter(id: string, focusId = id) {
  const target = document.getElementById(id);
  target?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  document.getElementById(focusId)?.focus({ preventScroll: true });
}
