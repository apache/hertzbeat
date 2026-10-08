/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';

import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { LogFacetField } from '../model/explore-log-facets';
import type { LogExploreQuery } from '../model/explore-model';
import type { LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreLogTransactionControls } from '../components/explore-log-transaction-controls';
import { ExploreLogsAddedSummary } from '../components/explore-logs-search-controls';

type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  fields: LogFacetField[];
  calculatedOpen?: boolean | undefined;
  onCalculatedOpenChange?: ((open: boolean) => void) | undefined;
  onAddComparison?: (() => void) | undefined;
  onAddCalculated?: (() => void) | undefined;
};

export function ExploreLogLegacyAuthoring({
  controller,
  t,
  fields,
  calculatedOpen,
  onCalculatedOpenChange,
  onAddComparison,
  onAddCalculated
}: Props) {
  const { query, submission } = controller;
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs') return null;
  const draft = submission.draft;
  if (!hasLegacyAuthoring(query, draft)) return null;
  return (
    <ExploreLogTransactionControls
      fields={fields}
      mode={draft.logAggregation}
      raw={draft.logTransactions}
      rawCalculated={draft.logCalculated}
      pending={isModePending(controller)}
      t={t}
      onMode={value => submission.updateField({ field: 'logAggregation', value })}
      onChange={value => submission.updateField({ field: 'logTransactions', value })}
      onCalculatedChange={value => submission.updateField({ field: 'logCalculated', value })}
      calculatedOpen={calculatedOpen}
      onCalculatedOpenChange={onCalculatedOpenChange}
      hideCalculatedAction
      additionSummary={
        onAddComparison && onAddCalculated ? (
          <ExploreLogsAddedSummary {...{ draft, t, onAddComparison, onAddCalculated }} />
        ) : undefined
      }
    />
  );
}

function isModePending(controller: Props['controller']) {
  const { query, submission } = controller;
  if (query.signal !== 'logs' || submission.draft.signal !== 'logs') return false;
  return (
    submission.draft.logAggregation !== query.logAggregation ||
    submission.draft.logTransactions !== query.logTransactions ||
    submission.draft.logCalculated !== query.logCalculated
  );
}

function hasLegacyAuthoring(query: LogExploreQuery, draft: LogExploreSubmissionDraft) {
  return Boolean(
    (query.logAggregation && query.logAggregation !== 'fields') ||
    (draft.logAggregation && draft.logAggregation !== 'fields') ||
    query.logTransactions !== undefined ||
    draft.logTransactions !== undefined ||
    query.logCalculated !== undefined ||
    draft.logCalculated !== undefined
  );
}
