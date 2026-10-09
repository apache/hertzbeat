/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import type { LogInspectorAnalysisIntent } from '../model/explore-log-inspector-analysis';
import type { LogFacetField } from '../model/explore-log-facets';
import type { LogSearchSuggestions } from '../model/explore-log-search-authoring';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';
import { logAnalysisReturnPath } from '../model/explore-log-analysis-navigation';
import { applyLogRepresentationChange } from '../model/explore-log-representation-change';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { useLogFacetCatalog } from '../controller/use-log-facets';
import { useLogSearchSuggestions } from '../controller/use-log-search-suggestions';
import { ExploreLogAuthoringRepresentation } from '../components/explore-log-authoring-representation';
import { ExploreLogAddAuthoring } from '../components/explore-log-add-authoring';
import { ExploreLogSubqueryDraft } from '../components/explore-log-subquery-authoring';
import { ExploreRetiredLogReferenceNotice } from '../components/explore-retired-log-reference-notice';
import { ExploreLogLegacyAuthoring } from './explore-log-legacy-authoring';
import styles from '../components/explore-log-analysis.module.css';

type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  focusIntent?: LogInspectorAnalysisIntent | undefined;
  onAnalysisFocused?: (() => void) | undefined;
  calculatedOpen?: boolean | undefined;
  onCalculatedOpenChange?: ((open: boolean) => void) | undefined;
  onAddComparison?: (() => void) | undefined;
  onAddCalculated?: (() => void) | undefined;
  queryActions?: ReactNode;
  onQuery?: (() => void) | undefined;
};

export function ExploreLogAuthoring({
  controller,
  t,
  focusIntent,
  onAnalysisFocused,
  calculatedOpen,
  onCalculatedOpenChange,
  onAddComparison,
  onAddCalculated,
  queryActions,
  onQuery
}: Props) {
  const { query, submission, result } = controller;
  const searchSuggestions = useLogSearchSuggestions(query, result);
  const transactionWindow = controller.transactions?.active ? controller.transactions.window : undefined;
  const facets = useLogFacetCatalog(
    query,
    result,
    query.signal === 'logs' && query.logCalculatedV2 === undefined,
    transactionWindow
  );
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs' || query.logRecordUid) return null;
  if (query.live && query.logAggregation !== 'transactions') return null;
  return (
    <LogAuthoringContent
      controller={controller}
      t={t}
      focusIntent={focusIntent}
      onAnalysisFocused={onAnalysisFocused}
      calculatedOpen={calculatedOpen}
      onCalculatedOpenChange={onCalculatedOpenChange}
      onAddComparison={onAddComparison}
      onAddCalculated={onAddCalculated}
      queryActions={queryActions}
      onQuery={onQuery}
      fields={facets.fields.data?.fields ?? []}
      searchSuggestions={searchSuggestions}
    />
  );
}

function LogAuthoringContent({
  controller,
  t,
  focusIntent,
  onAnalysisFocused,
  calculatedOpen,
  onCalculatedOpenChange,
  onAddComparison,
  onAddCalculated,
  queryActions,
  onQuery,
  fields,
  searchSuggestions
}: Props & { fields: LogFacetField[]; searchSuggestions: LogSearchSuggestions }) {
  const { query, submission } = controller;
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs') return null;
  const draft = submission.draft;
  const returnPath = logAnalysisReturnPath(query.returnTo);
  return (
    <div data-explore-log-region="authoring" className={styles.authoring}>
      <ExploreLogAddAuthoring
        raw={draft.logAnalysis}
        error={submission.errors.logAnalysis}
        onChange={value => submission.updateField({ field: 'logAnalysis', value })}
        onSubmit={onQuery}
        fields={fields}
        t={t}
      />
      <ExploreLogSubqueryDraft
        submission={submission}
        t={t}
        onSubmit={onQuery}
        fields={fields}
        suggestions={searchSuggestions}
      />
      <ExploreRetiredLogReferenceNotice submission={submission} t={t} />
      <ExploreLogLegacyAuthoring
        {...{ controller, t, fields, calculatedOpen, onCalculatedOpenChange, onAddComparison, onAddCalculated }}
      />
      {returnPath && (
        <Button type="link" className={styles.return ?? ''} onClick={() => controller.openPath(returnPath)}>
          {t('explore.logAnalysis.return')}
        </Button>
      )}
      <ExploreLogAuthoringRepresentation
        current={readLogAnalysisDraft(draft.logAnalysis) ?? DEFAULT_LOG_ANALYSIS}
        raw={query.logAnalysis}
        draftRaw={draft.logAnalysis}
        fields={fields}
        extraFields={calculatedFieldIds(draft.logCalculatedV2)}
        onRepresentationChange={representation => {
          applyLogRepresentationChange(query.logAnalysis, representation, patch => submission.applyLogPatch(patch));
        }}
        onSettingsApply={value => applyAnalysisSettings(submission, draft.logCalculatedV2, value)}
        focusIntent={focusIntent}
        onFocused={onAnalysisFocused}
        queryActions={queryActions}
        t={t}
      />
    </div>
  );
}

function calculatedFieldIds(raw: string | undefined) {
  return (
    parseLogCalculatedV2(raw)?.fields.flatMap(field =>
      (field.kind === 'formula' ? [field.name] : field.captures.map(capture => capture.name)).map(
        name => `calculated:${name}`
      )
    ) ?? []
  );
}

function applyAnalysisSettings(
  submission: ExploreSubmissionViewModel,
  calculated: string | undefined,
  value: import('@/platform/perses').LogAnalysisState
) {
  if (calculated !== undefined) {
    submission.updateField({ field: 'logAnalysis', value: JSON.stringify(value) });
    return true;
  }
  return submission.applyLogPatch({ logAnalysis: JSON.stringify(value) });
}
