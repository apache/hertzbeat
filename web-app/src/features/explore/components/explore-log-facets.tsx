/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Select, Tooltip } from 'antd';
import { useContext, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { FacetReadState } from './explore-log-facet-state';
import { useTranslation } from 'react-i18next';
import styles from './explore-log-facets.module.css';
import { FacetSections } from './explore-log-facet-sections';
import { FacetFieldSearch } from './explore-log-facet-catalog-search';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import type { ExploreLogFacetsProps } from './explore-log-facet-types';
import type { LogFacetField } from '../model/explore-log-facets';
import { searchFieldName } from '../model/explore-log-search-authoring';
export type { ExploreLogFacetsProps } from './explore-log-facet-types';
export function ExploreLogFacets(props: ExploreLogFacetsProps) {
  const { t } = useTranslation();
  const { data, hasCatalog, unavailable } = facetCatalog(props);
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

function FacetCatalogToolbar({
  data,
  hasCatalog,
  fieldOptions,
  chooseField
}: {
  data: ReturnType<typeof facetCatalog>['data'];
  hasCatalog: boolean;
  fieldOptions: { value: string; label: string }[];
  chooseField: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [addingField, setAddingField] = useState(false);
  const addButton = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  return (
    <>
      <div className={styles.catalogToolbar}>
        {data?.state === 'ready' && <FacetCatalogHelp data={data} />}
        <Button
          ref={addButton}
          className={styles.addField ?? ''}
          type="link"
          size="small"
          disabled={!hasCatalog}
          aria-expanded={addingField}
          onClick={() => setAddingField(open => !open)}
        >
          {t('explore.logFacets.core.add')}
        </Button>
      </div>
      {addingField && (
        <div className={styles.addFieldSelectRow}>
          <Select<string>
            showSearch
            aria-label={t('explore.logFacets.field')}
            placeholder={t('explore.logFacets.field')}
            value={null}
            disabled={!hasCatalog}
            options={fieldOptions}
            onChange={id => {
              chooseField(id);
              setAddingField(false);
              addButton.current?.focus();
            }}
            onInputKeyDown={event => {
              if (event.key !== 'Escape') return;
              setAddingField(false);
              addButton.current?.focus();
            }}
          />
        </div>
      )}
    </>
  );
}

function FacetCatalogHelp({ data }: { data: NonNullable<ReturnType<typeof facetCatalog>['data']> }) {
  const { t } = useTranslation();
  if (data.state !== 'ready') return null;
  return (
    <Tooltip
      title={
        <>
          {t('explore.logFacets.discovery', { count: data.coverage.scannedRows, limit: data.coverage.rowLimit })}{' '}
          {(data.truncated || data.coverage.hasMore) && t('explore.logFacets.limited')}
        </>
      }
      trigger={['hover', 'focus']}
    >
      <button className={styles.help} type="button" aria-label={t('explore.logFacets.discoveryHelp')}>
        <InfoCircleOutlined />
      </button>
    </Tooltip>
  );
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
