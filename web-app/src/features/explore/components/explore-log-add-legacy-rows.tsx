/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Checkbox, Input } from 'antd';
import type { TFunction } from 'i18next';
import type { LogAnalysisState } from '@/platform/perses';
import { parseQueryFormula } from '@/shared/query-context/query-formula';
import { ExploreLogSearchInput } from './explore-log-search-input';
import styles from './explore-log-add-authoring.module.css';

type Comparison = NonNullable<LogAnalysisState['comparison']>;
type RowProps = {
  comparison: Comparison;
  change: (next: Comparison | undefined) => void;
  t: TFunction;
  onSubmit?: (() => void) | undefined;
};

export function ExploreLogLegacyRows(props: RowProps) {
  return (
    <div className={styles.authoring} data-log-add-authoring>
      {props.comparison.search !== undefined && <QueryBRow {...props} />}
      {props.comparison.formula !== undefined && <FormulaRow {...props} />}
    </div>
  );
}

function QueryBRow({ comparison, change, t, onSubmit }: RowProps) {
  const dependent = formulaReferences(comparison.formula, 'b');
  const remove = () => {
    if (dependent) return;
    const rest = { ...comparison };
    delete rest.search;
    delete rest.searchSyntax;
    delete rest.timeShiftMs;
    change(rest.formula === undefined ? undefined : { ...rest, hidden: rest.hidden?.filter(item => item !== 'b') });
  };
  return (
    <div
      className={styles.row}
      role="group"
      aria-label={t('explore.logComparison.source', { source: 'b' })}
      data-log-comparison-source="b"
    >
      <span className={styles.label}>b</span>
      <div className={styles.queryInput}>
        <ExploreLogSearchInput
          value={comparison.search ?? ''}
          syntax={comparison.searchSyntax}
          onChange={search => change({ ...comparison, search })}
          onSubmit={onSubmit}
          t={t}
        />
      </div>
      <VisibilityButton source="b" {...{ comparison, change, t }} />
      <Button
        type="text"
        aria-label={t('explore.logAdd.removeQuery', { source: 'b' })}
        disabled={dependent}
        title={dependent ? t('explore.logAdd.dependency') : undefined}
        onClick={remove}
      >
        {t('common.delete')}
      </Button>
    </div>
  );
}

function FormulaRow({ comparison, change, t, onSubmit }: RowProps) {
  const remove = () => {
    const rest = { ...comparison };
    delete rest.formula;
    const next = { ...rest, hidden: rest.hidden?.filter(item => item !== 'formula') };
    change(next.search === undefined ? undefined : next);
  };
  return (
    <div className={styles.row} role="group" aria-label={t('explore.logAdd.formula', { ref: 'f1' })}>
      <label className={styles.formula}>
        <span className={styles.label}>f1</span>
        <Input
          value={comparison.formula ?? ''}
          aria-label={t('explore.logAdd.formula', { ref: 'f1' })}
          aria-invalid={!validFormula(comparison) || undefined}
          onChange={event => change({ ...comparison, formula: event.target.value })}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            onSubmit?.();
          }}
        />
      </label>
      <VisibilityButton source="formula" {...{ comparison, change, t }} />
      <Button type="text" aria-label={t('explore.logAdd.removeFormula', { ref: 'f1' })} onClick={remove}>
        {t('common.delete')}
      </Button>
      {!validFormula(comparison) && <span role="alert">{t('explore.logAdd.invalidFormula')}</span>}
    </div>
  );
}

export function VisibilityButton({ source, comparison, change, t }: RowProps & { source: 'a' | 'b' | 'formula' }) {
  const hidden = comparison.hidden ?? [];
  return (
    <Checkbox
      checked={!hidden.includes(source)}
      aria-label={t('explore.logComparison.showSource', { source: source === 'formula' ? 'f1' : source })}
      onChange={() =>
        change({
          ...comparison,
          hidden: hidden.includes(source) ? hidden.filter(item => item !== source) : [...hidden, source]
        })
      }
    />
  );
}

function formulaReferences(formula: string | undefined, source: string) {
  if (!formula) return false;
  try {
    return parseQueryFormula(formula).references.includes(source);
  } catch {
    return true;
  }
}

function validFormula(comparison: Comparison) {
  try {
    return parseQueryFormula(comparison.formula ?? '').references.every(
      source => source === 'a' || (source === 'b' && comparison.search !== undefined)
    );
  } catch {
    return false;
  }
}
