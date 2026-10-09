/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ExploreLogFacetSourceControls } from '../components/explore-log-facet-source-controls';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExploreLogFacets } from '../components/explore-log-facets';
import { ExploreWorkspaceFacetValues } from './explore-workspace-facet-values';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { useLogFacetCatalog } from '../controller/use-log-facets';
import {
  comparisonFacetContext,
  facetAction,
  nextQuerySetTarget,
  querySetFacetAction
} from './explore-workspace-log-facet-context';
import { ExploreCalculatedFacetValues } from './explore-calculated-facet-values';
import type { ExactTimeWindow } from '@/shared/query-context';
import { calculatedCatalogQuery } from '../model/explore-calculated-source-catalog';
export function ExploreWorkspaceLogFacets(props: {
  controller: ReturnType<typeof useExplorePageController>;
  enabled: boolean;
}) {
  return props.controller.query.signal === 'logs' && props.controller.query.live ? null : (
    <HistoricalLogFacets {...props} />
  );
}
// eslint-disable-next-line complexity -- comparison and multi-query facet states share this rendering path.
function HistoricalLogFacets({
  controller,
  enabled
}: {
  controller: ReturnType<typeof useExplorePageController>;
  enabled: boolean;
}) {
  const [targetSelection, setTargetSelection] = useState<{ sourceIds: string[]; refId: string }>({
    sourceIds: [],
    refId: 'a'
  });
  const preliminaryContext = comparisonFacetContext(controller, targetSelection.refId);
  const sourceIds = preliminaryContext.targets?.map(item => item.value) ?? [];
  const target = nextQuerySetTarget(sourceIds, targetSelection.sourceIds, targetSelection.refId);
  if (sourceIds.join(',') !== targetSelection.sourceIds.join(',') || targetSelection.refId !== target)
    setTargetSelection({ sourceIds, refId: target });
  const context =
    target === preliminaryContext.source ? preliminaryContext : comparisonFacetContext(controller, target);
  const { current, source, facetQuery } = context;
  const calculated = controller.query.signal === 'logs' && controller.query.logCalculatedV2 !== undefined;
  const rawCatalogQuery = calculatedCatalogQuery(facetQuery);
  const facetAvailable = context.querySet
    ? Boolean(context.appliedSource && context.draftSource && context.targetSyntax === 'structured-v1')
    : source === 'a' || facetQuery !== controller.query;
  const transactionWindow =
    !context.querySet && controller.transactions?.active ? controller.transactions.window : undefined;
  const facets = useLogFacetCatalog(
    rawCatalogQuery,
    controller.result,
    facetAvailable,
    transactionWindow,
    context.querySet || source !== 'a'
  );
  const { query } = controller;
  const extraFields = useMemo(() => calculatedOutputFields(controller.result), [controller.result]);
  if (query.signal !== 'logs') return null;
  const actionForValue = context.querySet
    ? querySetFacetAction(controller, enabled && facetAvailable, source)
    : facetAction(controller, enabled && facetAvailable, source === 'b' ? 'b' : 'a', Boolean(current));
  return (
    <>
      <HistoricalFacetSource
        controller={controller}
        context={context}
        onTarget={refId => setTargetSelection({ sourceIds, refId })}
      />
      <ExploreLogFacets
        {...facets}
        extraFields={calculated ? extraFields : undefined}
        renderValues={(fieldId, fieldLabel) =>
          facetValues({
            controller,
            fieldId,
            fieldLabel,
            enabled: enabled && facetAvailable,
            calculated,
            facetQuery,
            source: source === 'a' ? 'a' : 'b',
            transactionWindow,
            actionForValue
          })
        }
      />
    </>
  );
}

function facetValues({
  controller,
  fieldId,
  fieldLabel,
  enabled,
  calculated,
  facetQuery,
  source,
  transactionWindow,
  actionForValue
}: {
  controller: ReturnType<typeof useExplorePageController>;
  fieldId: string;
  fieldLabel: string;
  enabled: boolean;
  calculated: boolean;
  facetQuery: ReturnType<typeof comparisonFacetContext>['facetQuery'];
  source: 'a' | 'b';
  transactionWindow: ExactTimeWindow | undefined;
  actionForValue: ReturnType<typeof facetAction>;
}) {
  return calculated ? (
    <ExploreCalculatedFacetValues controller={controller} fieldId={fieldId} fieldLabel={fieldLabel} enabled={enabled} />
  ) : (
    <ExploreWorkspaceFacetValues
      query={facetQuery}
      result={controller.result}
      fieldId={fieldId}
      fieldLabel={fieldLabel}
      available={enabled}
      source={source}
      appliedWindow={transactionWindow}
      actionForValue={actionForValue}
    />
  );
}

function HistoricalFacetSource({
  controller,
  context,
  onTarget
}: {
  controller: ReturnType<typeof useExplorePageController>;
  context: ReturnType<typeof comparisonFacetContext>;
  onTarget: (target: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ExploreLogFacetSourceControls
      current={context.current}
      source={context.source}
      window={context.window}
      timeZone={controller.query.timeZone}
      draftSyntax={controller.submission.draft.signal === 'logs' ? controller.submission.draft.searchSyntax : undefined}
      targets={context.targets?.map(({ value }) => ({
        value,
        label: t('explore.logComparison.queryTarget', { ref: value })
      }))}
      targetSyntax={context.targetSyntax}
      onTarget={onTarget}
      t={t}
    />
  );
}

function calculatedOutputFields(result: ReturnType<typeof useExplorePageController>['result']) {
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  if ((evidence.kind !== 'ready' && evidence.kind !== 'empty') || evidence.signal !== 'logs') return [];
  return (
    evidence.calculated?.executed.calculatedFields.fields.flatMap(field =>
      field.outputs.map(output => ({ id: `calculated:${output.name}`, label: `#${output.name}` }))
    ) ?? []
  );
}
