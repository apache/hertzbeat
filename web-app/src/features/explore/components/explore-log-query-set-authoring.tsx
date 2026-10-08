/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Checkbox, Dropdown, Input, InputNumber, type MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import {
  DEFAULT_LOG_ANALYSIS,
  logGroupingFieldLabel,
  type LogQuerySet,
  type LogQuerySource,
  type LogQueryFormula
} from '@/platform/perses';
import { parseQueryFormula, QueryFormulaError } from '@/shared/query-context/query-formula';
import type { LogFacetField } from '../model/explore-log-facets';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { ExploreLogSearchInput } from './explore-log-search-input';
import { ExploreLogIntervalControls } from './explore-log-interval-controls';
import { SourceSettings } from './explore-log-query-set-source-settings';
import { AliasEditor, SourceActions } from './explore-log-query-set-row-actions';
import { removeLogSource } from '@/platform/perses';
import styles from './explore-log-add-authoring.module.css';

type Props = {
  value: LogQuerySet;
  raw: string | undefined;
  onChange: (raw: string) => void;
  fields: LogFacetField[];
  t: TFunction;
  onSubmit?: (() => void) | undefined;
  error?: string | undefined;
};

export function ExploreLogQuerySetAuthoring({ value, raw, onChange, fields, t, onSubmit, error }: Props) {
  const update = (next: LogQuerySet) => {
    const base = readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS;
    onChange(JSON.stringify({ ...base, querySet: next }));
  };
  const updateSource = (next: LogQuerySource) =>
    update({
      ...value,
      queries: value.queries.map(source => (source.refId === next.refId ? next : source))
    });
  const updateFormula = (next: LogQueryFormula) =>
    update({
      ...value,
      formulas: value.formulas.map(formula => (formula.refId === next.refId ? next : formula))
    });
  return (
    <div className={styles.authoring} data-log-query-set-authoring>
      {error && <p role="alert">{error}</p>}
      {value.queries.map(source => (
        <SourceRow
          key={source.refId}
          source={source}
          value={value}
          fields={fields}
          t={t}
          update={updateSource}
          remove={() => update(removeLogSource(value, source.refId))}
          onSubmit={onSubmit}
        />
      ))}
      {value.formulas.map(formula => (
        <FormulaRow
          key={formula.refId}
          formula={formula}
          value={value}
          t={t}
          update={updateFormula}
          remove={() => update({ ...value, formulas: value.formulas.filter(item => item.refId !== formula.refId) })}
          onSubmit={onSubmit}
        />
      ))}
      <div className={styles.commonSettings}>
        <ExploreLogIntervalControls
          value={readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS}
          onChange={next => onChange(JSON.stringify(next))}
          t={t}
        />
      </div>
    </div>
  );
}

function SourceRow({
  source,
  value,
  fields,
  t,
  update,
  remove,
  onSubmit
}: {
  source: LogQuerySource;
  value: LogQuerySet;
  fields: LogFacetField[];
  t: TFunction;
  update: (next: LogQuerySource) => void;
  remove: () => void;
  onSubmit?: (() => void) | undefined;
}) {
  const primary = value.queries[0]?.refId === source.refId;
  return (
    <div
      className={styles.source}
      role="group"
      aria-label={t('explore.logComparison.source', { source: source.refId })}
      data-log-query-source={source.refId}
    >
      {!primary && (
        <div className={styles.row}>
          <span className={styles.label}>{source.refId}</span>
          <div className={styles.queryInput}>
            <ExploreLogSearchInput
              value={source.search ?? ''}
              syntax={source.searchSyntax}
              onChange={search => update({ ...source, search })}
              onSubmit={onSubmit}
              t={t}
            />
          </div>
          <SourceActions {...{ source, value, update, remove, onSubmit, t }} />
        </div>
      )}
      <details className={styles.settings} open>
        <summary>
          {source.refId} · {t('explore.logAdd.configuration')} ·{' '}
          {t(`explore.logAnalysis.${source.analysis.measure?.function ?? 'count'}`)}
          {source.analysis.measure && ` · ${logGroupingFieldLabel(source.analysis.measure.field, t)}`}
          {source.analysis.transform === 'throughput' && ` · ${t('explore.logAnalysis.throughput')}`}
          {source.analysis.grouping?.dimensions.map(item => ` · ${logGroupingFieldLabel(item.field, t)}`).join('') ??
            (source.analysis.field ? ` · ${logGroupingFieldLabel(source.analysis.field, t)}` : '')}
        </summary>
        <SourceSettings {...{ source, fields, t, update }} />
      </details>
    </div>
  );
}

function FormulaRow({
  formula,
  value,
  t,
  update,
  remove,
  onSubmit
}: {
  formula: LogQueryFormula;
  value: LogQuerySet;
  t: TFunction;
  update: (next: LogQueryFormula) => void;
  remove: () => void;
  onSubmit?: (() => void) | undefined;
}) {
  let diagnostic: string | undefined;
  try {
    const unknown = parseQueryFormula(formula.expression).references.filter(
      ref => !value.queries.some(source => source.refId === ref)
    );
    if (unknown.length) diagnostic = t('explore.logAdd.formulaUnknownReferences', { refs: unknown.join(', ') });
  } catch (error) {
    diagnostic = t('explore.logAdd.formulaSyntax', {
      position: error instanceof QueryFormulaError ? error.position + 1 : 1
    });
  }
  return (
    <div className={styles.row} role="group" aria-label={t('explore.logAdd.formula', { ref: formula.refId })}>
      <span className={styles.label}>{formula.refId}</span>
      <div className={styles.formula}>
        <Input
          className={styles.queryInput}
          value={formula.expression}
          maxLength={256}
          aria-label={t('explore.logAdd.formula', { ref: formula.refId })}
          aria-invalid={diagnostic !== undefined || undefined}
          onChange={event => update({ ...formula, expression: event.target.value })}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (onSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <Dropdown
          trigger={['click']}
          menu={{
            items: formulaFunctionMenu(t),
            onClick: ({ key }) => {
              const name = key as FormulaFunctionName;
              update({
                ...formula,
                functions: [...(formula.functions ?? []), name === 'pow' ? { name, exponent: 2 } : { name }]
              });
            }
          }}
        >
          <Button type="default">{t('explore.logAdd.functions')}</Button>
        </Dropdown>
        <FormulaFunctions formula={formula} t={t} update={update} />
      </div>
      <AliasEditor
        refId={formula.refId}
        alias={formula.alias}
        t={t}
        onChange={alias => update({ ...formula, alias })}
        onSubmit={onSubmit}
      />
      <Checkbox
        checked={formula.visible}
        aria-label={t('explore.logComparison.showSource', { source: formula.refId })}
        onChange={event => update({ ...formula, visible: event.target.checked })}
      />
      <Button type="text" aria-label={t('explore.logAdd.removeFormula', { ref: formula.refId })} onClick={remove}>
        {t('common.delete')}
      </Button>
      {diagnostic && <span role="alert">{diagnostic}</span>}
    </div>
  );
}

type FormulaFunctionName = NonNullable<LogQueryFormula['functions']>[number]['name'];

function FormulaFunctions({
  formula,
  t,
  update
}: {
  formula: LogQueryFormula;
  t: TFunction;
  update: (next: LogQueryFormula) => void;
}) {
  return formula.functions?.map((fn, index) => (
    <span className={styles.functionChip} key={`${fn.name}-${index}`}>
      <span>{t(`explore.logAdd.function.${fn.name}`)}</span>
      {fn.name === 'pow' && (
        <InputNumber
          aria-label={t('explore.logAdd.powerExponent')}
          min={-16}
          max={16}
          value={fn.exponent}
          onChange={exponent => {
            if (exponent !== null && Number.isFinite(exponent))
              update({
                ...formula,
                functions: formula.functions!.map((item, itemIndex) =>
                  itemIndex === index && item.name === 'pow' ? { ...item, exponent } : item
                )
              });
          }}
        />
      )}
      <Button
        type="text"
        aria-label={t('explore.logAdd.removeFunction', { function: t(`explore.logAdd.function.${fn.name}`) })}
        onClick={() =>
          update({ ...formula, functions: formula.functions!.filter((_, itemIndex) => itemIndex !== index) })
        }
      >
        ×
      </Button>
    </span>
  ));
}

function formulaFunctionMenu(t: TFunction): NonNullable<MenuProps['items']> {
  return ['abs', 'log2', 'log10', 'pow', 'cumsum', 'integral'].map(name => ({
    key: name,
    label: t(`explore.logAdd.function.${name}`)
  }));
}
