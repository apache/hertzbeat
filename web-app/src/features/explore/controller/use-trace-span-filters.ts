/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import type { useExplorePageController } from './use-explore-page-controller';
import { logInspectorFilterPatch, logInspectorFilterDisabledReason } from '../model/explore-log-inspector-filter';
import { draftFromQuery } from '../model/explore-submission-model';
import type { SpanFilterControls } from '../model/explore-span-filter';
export function useTraceSpanFilters(controller: ReturnType<typeof useExplorePageController>): SpanFilterControls {
  const { t } = useTranslation(),
    { query, submission, result } = controller,
    draft = submission.draft;
  if (query.signal !== 'traces' || draft.signal !== 'traces' || result.kind !== 'ready') return {};
  return {
    spanFilterPending: JSON.stringify(draft) !== JSON.stringify(draftFromQuery(query)),
    onApplySpanFilters: submission.submit,
    spanFilterDisabledReason: (target, operator) => {
      const reason = logInspectorFilterDisabledReason(draft, target, operator, query);
      return reason
        ? t(reason === 'scope-locked' ? 'explore.perses.scopeLockedFilter' : 'explore.perses.editExistingFilter')
        : undefined;
    },
    onAddSpanFilter: (target, operator) => {
      // Both backends accept this guarded scalar subset, not every log filter expression.
      const patch = logInspectorFilterPatch(draft, target, operator, query);
      if (!patch) return false;
      if (patch.resourceFilter !== undefined)
        submission.updateField({ field: 'resourceFilter', value: patch.resourceFilter });
      if (patch.attributeFilter !== undefined)
        submission.updateField({ field: 'attributeFilter', value: patch.attributeFilter });
      return true;
    }
  };
}
