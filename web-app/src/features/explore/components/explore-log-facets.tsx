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

import type { TFunction } from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import { searchFieldName } from '../model/explore-log-search-authoring';
import { FacetFieldSearch } from './explore-log-facet-catalog-search';
import { FacetCatalogToolbar } from './explore-log-facet-catalog-toolbar';
import { FacetSections } from './explore-log-facet-sections';
import { FacetReadState } from './explore-log-facet-state';
import type { ExploreLogFacetsProps } from './explore-log-facet-types';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import styles from './explore-log-facets.module.css';
export type { ExploreLogFacetsProps } from './explore-log-facet-types';
export function ExploreLogFacets(props: ExploreLogFacetsProps) {
  const { t } = useTranslation();
  const { data, hasCatalog, unavailable } = facetCatalog(props);
  const { fieldOptions, coreFields, addedFields, expanded, chooseField, toggleField, removeField } = useFacetSelection(
    props,
    data,
    hasCatalog,
    t
  );
  return (
    <section className={styles.facets} aria-label={t('explore.logFacets.title')}>
      <FacetFieldSearch options={fieldOptions} enabled={hasCatalog} onFieldChange={chooseField} />
      <FacetCatalogToolbar data={data} hasCatalog={hasCatalog} fieldOptions={fieldOptions} chooseField={chooseField} />
      <FacetReadState state={props.fields.state} unavailable={unavailable} onRetry={props.onCatalogRetry} />
      {hasCatalog && (
        <FacetSections
          coreFields={coreFields}
          addedFields={addedFields}
          expanded={expanded}
          onToggle={toggleField}
          onRemove={removeField}
          renderValues={props.renderValues}
        />
      )}
    </section>
  );
}

function facetFieldLists(
  data: ReturnType<typeof facetCatalog>['data'],
  extraFields: ExploreLogFacetsProps['extraFields'],
  added: string[],
  t: TFunction
) {
  const fieldOptions = [
    ...(data?.fields ?? []).map(field => ({
      value: field.id,
      label: field.source === 'builtin' ? t(`explore.logFacets.builtin.${field.key}`) : facetFieldLabel(field)
    })),
    ...(extraFields ?? []).map(field => ({ value: field.id, label: field.label }))
  ];
  const coreFields = [
    { id: 'resource:host.name', label: t('explore.logFacets.core.host') },
    { id: 'builtin:serviceName', label: t('explore.logFacets.core.service') },
    { id: 'builtin:severityCategory', label: t('explore.logFacets.core.status') }
  ].filter(field => fieldOptions.some(option => option.value === field.id));
  const extraFieldIds = new Set((extraFields ?? []).map(field => field.id));
  const addedFields: Array<{ id: string; label: string; removable?: boolean }> = [
    ...added
      .filter(id => !coreFields.some(field => field.id === id) && !extraFieldIds.has(id))
      .map(id => fieldOptions.find(option => option.value === id))
      .filter((option): option is { value: string; label: string } => option !== undefined)
      .map(option => ({ id: option.value, label: option.label, removable: true })),
    ...(extraFields ?? [])
  ];
  return { fieldOptions, coreFields, addedFields };
}

function facetFieldLabel(field: LogFacetField) {
  return searchFieldName(field) ?? field.key;
}

function facetCatalog(props: ExploreLogFacetsProps) {
  const typedFailure = ['calculated_budget_exceeded', 'calculated_invalid_pattern'].includes(props.fields.state);
  const data = [
    'permission',
    'idle',
    'unavailable',
    'calculated_budget_exceeded',
    'calculated_invalid_pattern'
  ].includes(props.fields.state)
    ? undefined
    : props.fields.data;
  const hasCatalog =
    !typedFailure && ((data?.state === 'ready' && data.fields.length > 0) || Boolean(props.extraFields?.length));
  return {
    data,
    hasCatalog,
    unavailable: data?.state === 'unavailable' || (data?.state === 'ready' && !hasCatalog)
  };
}

function useFacetSelection(
  props: ExploreLogFacetsProps,
  data: ReturnType<typeof facetCatalog>['data'],
  hasCatalog: boolean,
  t: TFunction
) {
  const workspace = useContext(LogFacetVisibilityContext);
  const [localExpanded, setLocalExpanded] = useState(['builtin:severityCategory']);
  const [localAdded, setLocalAdded] = useState<string[]>([]);
  const expanded = workspace?.expandedFacetIds ?? localExpanded;
  const added = workspace?.addedFacetIds ?? localAdded;
  const setAvailableFacetIds = workspace?.setAvailableFacetIds;
  useEffect(() => {
    setAvailableFacetIds?.(
      hasCatalog
        ? [
            ...(data?.state === 'ready' ? data.fields.map(field => field.id) : []),
            ...(props.extraFields?.map(field => field.id) ?? [])
          ]
        : []
    );
    return () => setAvailableFacetIds?.([]);
  }, [data, hasCatalog, props.extraFields, setAvailableFacetIds]);
  const { fieldOptions, coreFields, addedFields } = facetFieldLists(data, props.extraFields, added, t);
  const chooseField = (id: string) => {
    if (props.extraFields?.some(field => field.id === id)) {
      if (workspace) {
        if (!expanded.includes(id)) workspace.toggleFacet(id);
      } else setLocalExpanded(current => (current.includes(id) ? current : [...current, id]));
      return;
    }
    const field = data?.state === 'ready' ? data.fields.find(item => item.id === id) : undefined;
    if (!field) return;
    if (workspace) workspace.onAddFacet(field);
    else {
      if (!coreFields.some(item => item.id === id))
        setLocalAdded(current => (current.includes(id) ? current : [...current, id]));
      setLocalExpanded(current => (current.includes(id) ? current : [...current, id]));
    }
  };
  const toggleField = (id: string) =>
    workspace
      ? workspace.toggleFacet(id)
      : setLocalExpanded(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  const removeField = (id: string) => {
    if (workspace) {
      workspace.removeFacet(id);
      return;
    }
    setLocalAdded(current => current.filter(item => item !== id));
    setLocalExpanded(current => current.filter(item => item !== id));
  };
  return { fieldOptions, coreFields, addedFields, expanded, chooseField, toggleField, removeField };
}
