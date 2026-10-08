/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
export function savedViewTriggerLabel(
  model: Pick<SavedQueriesViewModel, 'active' | 'activeLoading' | 'activeUnavailable'>,
  t: TFunction
) {
  if (model.active) return model.active.label;
  if (model.activeLoading) return t('exploreSaved.states.loading');
  if (model.activeUnavailable) return t('exploreSaved.activeUnavailable');
  return t('exploreSaved.myView');
}
