/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0. */

export function focusTraceInspector(inspector: HTMLElement) {
  const workspace = inspector.closest('[data-trace-presentation="drawer"]');
  if (!workspace) {
    inspector.focus();
    return;
  }
  inspector.focus({ preventScroll: true });
  const header = inspector.querySelector('header');
  const body = inspector.closest('.ant-drawer-body');
  const context = workspace.querySelector('[data-trace-detail-context]');
  if (!header || !body || !context) return;
  const target = header.getBoundingClientRect();
  const viewport = body.getBoundingClientRect();
  const top = Math.max(viewport.top, context.getBoundingClientRect().bottom);
  if (target.top < top || target.bottom > viewport.bottom) {
    header.scrollIntoView({ block: 'nearest' });
  }
}
