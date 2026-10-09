/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { validLogAnalysis, type LogAnalysisState } from '@/platform/perses';
import { hasUnsupportedLegacyLogAnalysis } from '../model/explore-log-analysis';
import type { LogFacetField } from '../model/explore-log-facets';
import type { LogInspectorAnalysisIntent } from '../model/explore-log-inspector-analysis';
import { ExploreLogAnalysisRepresentations } from './explore-log-analysis-controls';
import { ExploreLogAnalysisSettings } from './explore-log-analysis-settings';

type RepresentationProps = {
  current: LogAnalysisState;
  raw: string | undefined;
  draftRaw: string | undefined;
  fields: LogFacetField[];
  extraFields?: string[];
  onRepresentationChange: (value: LogAnalysisState['representation']) => void;
  onSettingsApply: (value: LogAnalysisState) => boolean;
  focusIntent?: LogInspectorAnalysisIntent | undefined;
  onFocused?: (() => void) | undefined;
  queryActions?: ReactNode;
  t: TFunction;
};
export function ExploreLogAuthoringRepresentation({
  current,
  raw,
  draftRaw,
  fields,
  extraFields = [],
  onRepresentationChange,
  onSettingsApply,
  focusIntent,
  onFocused,
  queryActions,
  t
}: RepresentationProps) {
  const valid = validLogAnalysis(raw) && validLogAnalysis(draftRaw);
  const pending = draftRaw !== raw;
  const unsupportedLegacy = [raw, draftRaw].some(hasUnsupportedLegacyLogAnalysis);
  return (
    <>
      {unsupportedLegacy && <p role="alert">{t('explore.logAnalysis.legacyUnsupported')}</p>}
      <ExploreLogAnalysisRepresentations
        value={current.representation}
        disabled={!valid || unsupportedLegacy}
        comparison={Boolean(
          current.comparison ||
          (current.querySet && (current.querySet.queries.length > 1 || current.querySet.formulas.length > 0))
        )}
        transform={current.transform}
        onChange={onRepresentationChange}
        settingsAction={
          <AnalysisSettingsAction
            {...{
              current,
              fields,
              extraFields,
              onSettingsApply,
              pending,
              valid,
              draftRaw,
              focusIntent,
              onFocused,
              queryActions,
              t
            }}
            unsupportedLegacy={unsupportedLegacy}
          />
        }
        t={t}
      />
    </>
  );
}

function AnalysisSettingsAction({
  current,
  fields,
  extraFields,
  onSettingsApply,
  pending,
  valid,
  unsupportedLegacy,
  draftRaw,
  focusIntent,
  onFocused,
  queryActions,
  t
}: {
  current: LogAnalysisState;
  fields: LogFacetField[];
  extraFields: string[];
  onSettingsApply: (value: LogAnalysisState) => boolean;
  pending: boolean;
  valid: boolean;
  unsupportedLegacy: boolean;
  draftRaw: string | undefined;
  focusIntent?: LogInspectorAnalysisIntent | undefined;
  onFocused?: (() => void) | undefined;
  queryActions?: ReactNode;
  t: TFunction;
}) {
  if (current.querySet) return queryActions;
  return (
    <>
      <ExploreLogAnalysisSettings
        showTrigger={current.representation === 'timeseries' || !valid || unsupportedLegacy}
        value={current}
        fields={fields}
        extraFields={extraFields}
        onChange={onSettingsApply}
        pending={pending}
        invalid={!valid}
        unsupported={unsupportedLegacy}
        rawDraft={draftRaw}
        focusIntent={focusIntent}
        onFocused={onFocused}
        t={t}
      />
      {queryActions}
    </>
  );
}
