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

import { Input } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { FacetReadState } from '../components/explore-log-facet-state';
import { FacetValueRow } from '../components/explore-log-facet-values';
import styles from '../components/explore-log-facets.module.css';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { useCalculatedFacetValues } from '../controller/use-calculated-facet-values';
import { useLogFacetSearch } from '../controller/use-log-facet-search';
import { calculatedFacetSelection } from '../model/explore-calculated-facet-action';
import { logFacetAction } from '../model/explore-log-facet-action';
import { logFacetFieldSchema } from '../model/explore-log-facets';

type Controller = ReturnType<typeof useExplorePageController>;

export function ExploreCalculatedFacetValues({
  controller,
  fieldId,
  fieldLabel,
  enabled
}: {
  controller: Controller;
  fieldId: string;
  fieldLabel: string;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const view = useFacetView(controller, fieldId, enabled);
  return (
    <>
      {view.searchable && (
        <Input
          allowClear
          maxLength={256}
          aria-label={`${fieldLabel} ${t('explore.logFacets.search')}`}
          placeholder={t('explore.logFacets.search')}
          value={view.search.valueSearch}
          onChange={event => view.search.onValueSearchChange(event.target.value)}
        />
      )}
      <FacetReadState state={view.state} unavailable={view.unavailable} onRetry={view.onRetry} />
      {view.data && <CalculatedFacetRows data={view.data} ready={view.ready} selection={view.selection} t={t} />}
    </>
  );
}

function useFacetView(controller: Controller, fieldId: string, enabled: boolean) {
  const type = facetType(controller.result, fieldId);
  const appliedDefinitions = controller.query.signal === 'logs' ? controller.query.logCalculatedV2 : undefined;
  const search = useLogFacetSearch(`${fieldId}|${appliedDefinitions ?? ''}`);
  const searchable = type === 'string';
  const { values, onRetry } = useCalculatedFacetValues(
    controller.query,
    controller.result,
    fieldId,
    searchable ? search.valueSearch : '',
    enabled && type !== undefined && (!searchable || !search.pending)
  );
  const data = values.data?.result;
  const draft = controller.submission.draft;
  const canFilter = canFilterFacet(enabled, values.state, draft, appliedDefinitions);
  const selection = (value: string | number | boolean, intent: 'single' | 'toggle') =>
    facetSelection(controller, fieldId, value, intent, canFilter);
  return {
    data,
    search,
    searchable,
    selection,
    onRetry,
    ready: values.state === 'ready',
    state: type === undefined ? ('unavailable' as const) : (search.pending ?? values.state),
    unavailable: type === undefined || search.pending === 'unavailable'
  };
}

function facetSelection(
  controller: Controller,
  fieldId: string,
  value: string | number | boolean,
  intent: 'single' | 'toggle',
  enabled: boolean
) {
  const draft = controller.submission.draft;
  if (!enabled || draft.signal !== 'logs' || controller.query.signal !== 'logs')
    return { selected: false, disabled: true, onClick: () => {} };
  const [source, ...parts] = fieldId.split(':');
  const field = logFacetFieldSchema.safeParse({ id: fieldId, source, key: parts.join(':') });
  const action = field.success
    ? logFacetAction(draft, controller.query, field.data, String(value), '=', intent)
    : calculatedFacetSelection(draft, controller.query, fieldId, value, intent);
  return {
    selected: action.selected,
    disabled: !action.update,
    onClick: () => {
      if (!action.update) return;
      controller.submission.updateField(action.update);
      controller.submission.submit();
    }
  };
}

function canFilterFacet(
  enabled: boolean,
  state: string,
  draft: Controller['submission']['draft'],
  appliedDefinitions: string | undefined
) {
  return enabled && state === 'ready' && draft.signal === 'logs' && draft.logCalculatedV2 === appliedDefinitions;
}

type FacetData = NonNullable<ReturnType<typeof useCalculatedFacetValues>['values']['data']>['result'];

function CalculatedFacetRows({
  data,
  ready,
  selection,
  t
}: {
  data: FacetData;
  ready: boolean;
  selection: (value: string | number | boolean, intent: 'single' | 'toggle') => ReturnType<typeof facetSelection>;
  t: TFunction;
}) {
  return (
    <>
      {!ready && <p role="status">{t('explore.logFacets.stale')}</p>}
      {data.search && <p>{t('explore.logFacets.searchMatches', { count: data.search.matchedCount })}</p>}
      <ul className={styles.values} aria-label={t('explore.logFacets.population', { count: data.matchingTotal })}>
        {data.values.map(item => (
          <FacetValueRow
            key={`${typeof item.value}:${item.value}`}
            label={String(item.value) || t('explore.logFacets.emptyString')}
            count={item.count}
            enabled={ready}
            include={selection(item.value, 'toggle')}
            single={selection(item.value, 'single')}
          />
        ))}
      </ul>
      {!data.values.length && <p role="status">{t('explore.logFacets.empty')}</p>}
      {data.missingOrNullCount > 0 && <p>{t('explore.logFacets.missing', { count: data.missingOrNullCount })}</p>}
      {data.truncated && <p>{t(data.search ? 'explore.logFacets.searchLimited' : 'explore.logFacets.limited')}</p>}
    </>
  );
}

function facetType(result: Controller['result'], fieldId: string) {
  if (!fieldId.startsWith('calculated:')) return 'string';
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  if ((evidence.kind !== 'ready' && evidence.kind !== 'empty') || evidence.signal !== 'logs') return undefined;
  const name = fieldId.slice('calculated:'.length);
  return evidence.calculated?.executed.calculatedFields.fields
    .flatMap(field => field.outputs)
    .find(output => output.name === name)?.type;
}
