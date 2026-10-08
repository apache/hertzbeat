/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { KeyboardEvent } from 'react';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
export function dismissViews(event: KeyboardEvent<HTMLElement>, model: SavedQueriesViewModel) {
  if (event.key !== 'Escape' || !model.open || event.defaultPrevented) return;
  const target = event.target;
  if (!(target instanceof HTMLElement) || !event.currentTarget.contains(target)) return;
  if (target.closest('[role="combobox"][aria-expanded="true"]')) return;
  event.preventDefault();
  event.stopPropagation();
  model.setOpen(false);
  document.getElementById('explore-logs-views-trigger')?.focus();
}
