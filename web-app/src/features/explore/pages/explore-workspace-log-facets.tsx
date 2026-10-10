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

import { ExploreLogFacetSourceControls } from '../components/explore-log-facet-source-controls';
import { useTranslation } from 'react-i18next';
import { ExploreLogFacets } from '../components/explore-log-facets';
import { ExploreWorkspaceFacetValues } from './explore-workspace-facet-values';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { useWorkspaceLogFacets } from '../controller/use-workspace-log-facets';
import type { comparisonFacetContext, facetAction } from './explore-workspace-log-facet-context';
import { ExploreCalculatedFacetValues } from './explore-calculated-facet-values';
import type { ExactTimeWindow } from '@/shared/query-context';
export function ExploreWorkspaceLogFacets(props: {
  controller: ReturnType<typeof useExplorePageController>;
  enabled: boolean;
}) {
  return props.controller.query.signal === 'logs' && props.controller.query.live ? null : (
    <HistoricalLogFacets {...props} />
  );
}
function HistoricalLogFacets({
  controller,
  enabled
}: {
  controller: ReturnType<typeof useExplorePageController>;
  enabled: boolean;
}) {
  const { context, facets, calculated, extraFields, facetAvailable, transactionWindow, actionForValue, onTarget } =
    useWorkspaceLogFacets(controller, enabled);
  const { source, facetQuery } = context;
  if (controller.query.signal !== 'logs') return null;
  return (
    <>
      <HistoricalFacetSource controller={controller} context={context} onTarget={onTarget} />
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
