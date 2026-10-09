/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Dropdown } from 'antd';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import {
  DEFAULT_LOG_ANALYSIS,
  canMigrateLogQuerySet,
  hasIncompatibleFormulaGrouping,
  type LogAnalysisState
} from '@/platform/perses';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { ExploreLogLegacyRows, VisibilityButton } from './explore-log-add-legacy-rows';
import { ExploreLogQuerySetAuthoring } from './explore-log-query-set-authoring';
import { ExploreLogCalculatedV2Editor } from './explore-log-calculated-v2-editor';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import { addMenuItems } from './explore-log-add-menu-items';
import type { LogFacetField } from '../model/explore-log-facets';
import { defaultLogSubquery } from '../model/explore-log-subquery';
import { writeQuerySet } from './explore-log-add-query-set';
import styles from './explore-log-add-authoring.module.css';
import { useLogCalculatedFromField } from './explore-log-calculated-from-field-context';
import type { LogRow } from '../model/explore-signal-contract';

type Props = {
  raw: string | undefined;
  searchSyntax: string | undefined;
  t: TFunction;
  onChange: (raw: string) => void;
  onSubmit?: (() => void) | undefined;
  query?: string | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
  fields?: LogFacetField[] | undefined;
  error?: string | undefined;
  calculatedRaw?: string | undefined;
  onCalculatedChange?: ((raw: string) => void) | undefined;
  onSyntaxChange?: ((syntax: string) => void) | undefined;
  validateCalculated?: ValidateCalculatedFields | undefined;
  sources?: LogFacetField[] | undefined;
  subqueryRaw?: string | undefined;
  onSubqueryChange?: ((raw: string) => void) | undefined;
  subqueryAvailable?: boolean | undefined;
};
type Comparison = NonNullable<LogAnalysisState['comparison']>;
function writeComparison(raw: string | undefined, next: Comparison | undefined, onChange: Props['onChange']) {
  const base = readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS;
  const rest = { ...base };
  delete rest.comparison;
  onChange(JSON.stringify(next ? { ...rest, representation: 'timeseries', comparison: next } : rest));
}

export function ExploreLogAddMenu(props: Props) {
  const {
    raw,
    searchSyntax,
    query = '',
    onQueryChange,
    t,
    onChange,
    calculatedRaw,
    onCalculatedChange,
    onSyntaxChange,
    validateCalculated,
    sources = []
  } = props;
  const calculatedEditor = useCalculatedEditorRequest();
  const analysis = readLogAnalysisDraft(raw);
  const comparison = analysis?.comparison;
  const querySet = analysis?.querySet;
  const migrationBlocked = !querySet && !canMigrateLogQuerySet(analysis ?? DEFAULT_LOG_ANALYSIS);
  const change = (next: Comparison | undefined) => writeComparison(raw, next, onChange);
  const changeV2 = (kind: 'query' | 'formula') =>
    writeQuerySet(raw, query, searchSyntax, kind, onChange, onQueryChange);
  return (
    <span className={styles.actions} data-log-add-actions>
      {comparison && !querySet && <VisibilityButton source="a" comparison={comparison} change={change} t={t} />}
      <Dropdown
        disabled={raw !== undefined && !analysis}
        trigger={['click']}
        menu={{
          items: menuItems(props, analysis, migrationBlocked),
          onClick: ({ key }) => handleAddMenuClick(key, changeV2, calculatedEditor.setOpen, props)
        }}
      >
        <Button title={t('explore.logAdd.add')}>{t('explore.logAdd.add')}</Button>
      </Dropdown>
      <CalculatedAddEditor
        open={calculatedEditor.open}
        raw={calculatedRaw}
        validate={validateCalculated}
        t={t}
        onClose={calculatedEditor.close}
        onChange={onCalculatedChange}
        onSyntaxChange={onSyntaxChange}
        sources={sources}
        {...(calculatedEditor.expression ? { initialExpression: calculatedEditor.expression } : {})}
        {...(calculatedEditor.row ? { contextRow: calculatedEditor.row } : {})}
      />
    </span>
  );
}

function useCalculatedEditorRequest() {
  const [open, setOpen] = useState(false);
  const context = useLogCalculatedFromField();
  return {
    open: open || Boolean(context?.request),
    setOpen,
    expression: context?.request?.expression,
    row: context?.request?.row,
    close: () => {
      setOpen(false);
      context?.clear();
    }
  };
}

function menuItems(props: Props, analysis: LogAnalysisState | undefined, migrationBlocked: boolean) {
  return addMenuItems(
    props.t,
    analysis?.querySet,
    analysis?.comparison,
    migrationBlocked,
    props.calculatedRaw,
    Boolean(props.onCalculatedChange && props.validateCalculated),
    canAddSubquery(props.subqueryAvailable, props.onSubqueryChange, props.subqueryRaw),
    props.searchSyntax
  );
}

function canAddSubquery(available: boolean | undefined, onChange: Props['onSubqueryChange'], raw: string | undefined) {
  return Boolean(available && onChange && raw === undefined);
}

function handleAddMenuClick(
  key: string,
  changeV2: (kind: 'query' | 'formula') => void,
  setCalculatedOpen: (open: boolean) => void,
  props: Props
) {
  if (key === 'query' || key === 'formula') changeV2(key);
  if (key === 'calculated') setCalculatedOpen(true);
  if (key === 'subquery' && props.subqueryAvailable) props.onSubqueryChange?.(JSON.stringify(defaultLogSubquery()));
}

function CalculatedAddEditor({
  open,
  raw,
  validate,
  t,
  onClose,
  onChange,
  onSyntaxChange,
  sources,
  initialExpression,
  contextRow
}: {
  open: boolean;
  raw: string | undefined;
  validate: ValidateCalculatedFields | undefined;
  t: TFunction;
  onClose: () => void;
  onChange: ((raw: string) => void) | undefined;
  onSyntaxChange: ((syntax: string) => void) | undefined;
  sources: LogFacetField[];
  initialExpression?: string | undefined;
  contextRow?: LogRow | undefined;
}) {
  if (!open || !validate || !onChange) return null;
  return (
    <ExploreLogCalculatedV2Editor
      raw={raw}
      {...(initialExpression ? { initialExpression } : {})}
      {...(contextRow ? { contextRow } : {})}
      sources={sources}
      validate={validate}
      t={t}
      onClose={onClose}
      onApply={next => {
        onChange(next);
        onSyntaxChange?.('structured-v2');
      }}
    />
  );
}

export function ExploreLogAddAuthoring({
  raw,
  t,
  onChange,
  onSubmit,
  fields = [],
  error
}: Omit<Props, 'searchSyntax'>) {
  const analysis = readLogAnalysisDraft(raw);
  if (analysis?.querySet)
    return (
      <ExploreLogQuerySetAuthoring
        value={analysis.querySet}
        raw={raw}
        onChange={onChange}
        fields={fields}
        t={t}
        onSubmit={onSubmit}
        error={
          error
            ? t(
                hasIncompatibleFormulaGrouping(analysis.querySet)
                  ? 'explore.logAdd.groupingMismatch'
                  : 'explore.logAdd.invalidQuerySet'
              )
            : undefined
        }
      />
    );
  const comparison = analysis?.comparison;
  const change = (next: Comparison | undefined) => writeComparison(raw, next, onChange);
  return comparison ? (
    <ExploreLogLegacyRows comparison={comparison} change={change} t={t} onSubmit={onSubmit} />
  ) : (
    <div className={styles.authoring} data-log-add-authoring />
  );
}
