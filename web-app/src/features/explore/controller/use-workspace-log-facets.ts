/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMemo, useState } from 'react';
import type { useExplorePageController } from './use-explore-page-controller';
import { useLogFacetCatalog } from './use-log-facets';
import { comparisonFacetContext, nextQuerySetTarget } from './explore-log-facet-context';
import { facetAction, querySetFacetAction } from './explore-log-facet-actions';
import { calculatedCatalogQuery } from '../model/explore-calculated-source-catalog';

export function useWorkspaceLogFacets(controller: ReturnType<typeof useExplorePageController>, enabled: boolean) {
  const { context, onTarget } = useFacetTargetSelection(controller);
  const { current, source, facetQuery } = context;
  const calculated = controller.query.signal === 'logs' && controller.query.logCalculatedV2 !== undefined;
  const rawCatalogQuery = calculatedCatalogQuery(facetQuery);
  const facetAvailable = isFacetAvailable(controller, context);
  const transactionWindow =
    !context.querySet && controller.transactions?.active ? controller.transactions.window : undefined;
  const facets = useLogFacetCatalog(
    rawCatalogQuery,
    controller.result,
    facetAvailable,
    transactionWindow,
    context.querySet || source !== 'a'
  );
  const extraFields = useMemo(() => calculatedOutputFields(controller.result), [controller.result]);
  const actionForValue = context.querySet
    ? querySetFacetAction(controller, enabled && facetAvailable, source)
    : facetAction(controller, enabled && facetAvailable, source === 'b' ? 'b' : 'a', Boolean(current));
  return {
    context,
    facets,
    calculated,
    extraFields,
    facetAvailable,
    transactionWindow,
    actionForValue,
    onTarget
  };
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

function useFacetTargetSelection(controller: ReturnType<typeof useExplorePageController>) {
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
  return { context, onTarget: (refId: string) => setTargetSelection({ sourceIds, refId }) };
}

function isFacetAvailable(
  controller: ReturnType<typeof useExplorePageController>,
  context: ReturnType<typeof comparisonFacetContext>
) {
  const { source, facetQuery } = context;
  return context.querySet
    ? Boolean(context.appliedSource && context.draftSource && context.targetSyntax === 'structured-v1')
    : source === 'a' || facetQuery !== controller.query;
}
