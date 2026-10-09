/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useRef, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, type InputRef } from 'antd';
import { useTranslation } from 'react-i18next';
import { encodeMetricPlan, nextMetricReference, validateMetricPlan, type MetricPlan } from '@/platform/perses';
import { MetricPlanIssues } from './metric-plan-issues';
import { MetricPlanQueryRows } from './metric-plan-query-rows';
import styles from './explore-metric-plan-editor.module.css';
import type { MetricPlanEditorProps } from './explore-metric-plan-editor-props';
export type { MetricPlanEditorProps } from './explore-metric-plan-editor-props';

export function ExploreMetricPlanEditor(props: MetricPlanEditorProps) {
  const [oversized, setOversized] = useState(false);
  const { t } = useTranslation();
  const change = (plan: MetricPlan) => {
    try {
      encodeMetricPlan(plan);
    } catch {
      setOversized(true);
      return;
    }
    setOversized(false);
    props.onChange(plan);
  };
  return (
    <>
      <MetricPlanEditor {...props} onChange={change} />
      {oversized && (
        <p role="alert" className={styles.issue}>
          {t('explore.metricComposition.tooLarge')}
        </p>
      )}
    </>
  );
}
function MetricPlanEditor(props: MetricPlanEditorProps) {
  const { plan, onChange } = props;
  const { t } = useTranslation();
  const nextRef = nextMetricReference(plan);
  const pristineEmpty =
    props.pristine && plan.queries.length === 1 && plan.queries[0]?.refId === 'a' && !plan.formulas.length;
  const issues = validateMetricPlan(plan).filter(issue => !(pristineEmpty && issue.reason === 'metric'));
  return (
    <div className={styles.editor}>
      <MetricPlanQueryRows {...props} />
      <MetricFormulaRows plan={plan} onChange={onChange} />
      <MetricPlanIssues issues={issues} />
      <div className={styles.actions} data-metric-authoring-footer>
        <Button
          type="text"
          icon={<PlusOutlined aria-hidden />}
          disabled={plan.queries.length >= 4 || !nextRef}
          onClick={() => {
            if (!nextRef) return;
            onChange({ ...plan, queries: [...plan.queries, { refId: nextRef, metric: '' }] });
            props.onActiveRefChange(nextRef);
          }}
        >
          {t('explore.metricComposition.addQuery')}
        </Button>
        <Button
          type="text"
          icon={<PlusOutlined aria-hidden />}
          disabled={plan.formulas.length >= 4}
          onClick={() => {
            const id = ['f1', 'f2', 'f3', 'f4'].find(
              candidate => !plan.formulas.some(formula => formula.id === candidate)
            );
            if (id)
              onChange({
                ...plan,
                formulas: [
                  ...plan.formulas,
                  {
                    id,
                    expression:
                      plan.queries.find(row => row.refId === props.activeRef)?.refId ?? plan.queries[0]?.refId ?? 'a'
                  }
                ]
              });
          }}
        >
          {t('explore.metricComposition.addFormula')}
        </Button>
        <details className={styles.syntaxHelp}>
          <summary>{t('explore.metricComposition.formulaHelp')}</summary>
          <p className={styles.hint}>{t('explore.metricComposition.formulaHint')}</p>
        </details>
      </div>
    </div>
  );
}

function MetricFormulaRows({ plan, onChange }: Pick<MetricPlanEditorProps, 'plan' | 'onChange'>) {
  return (
    <>
      {plan.formulas.map(formula => (
        <MetricFormulaRow
          key={formula.id}
          formula={formula}
          source={plan.queries[0]?.refId ?? 'a'}
          onChange={expression =>
            onChange({
              ...plan,
              formulas: plan.formulas.map(item => (item.id === formula.id ? { ...item, expression } : item))
            })
          }
          onRemove={() => onChange({ ...plan, formulas: plan.formulas.filter(item => item.id !== formula.id) })}
        />
      ))}
    </>
  );
}

function MetricFormulaRow({
  formula,
  source,
  onChange,
  onRemove
}: {
  formula: MetricPlan['formulas'][number];
  source: string;
  onChange: (expression: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const input = useRef<InputRef>(null);
  const functions = ['abs', 'log2', 'log10', 'pow', 'minimum', 'maximum'] as const;
  const wrapped = (name: string) => wrapMetricFunction(name, formula.expression.trim() || source);
  return (
    <div className={styles.formula}>
      <span className={styles.reference}>{formula.id}</span>
      <Input
        ref={input}
        data-metric-plan-ref={formula.id}
        aria-label={t('explore.metricComposition.formula', { ref: formula.id })}
        maxLength={256}
        value={formula.expression}
        placeholder="a / b * 100"
        onChange={event => onChange(event.target.value)}
      />
      <Dropdown
        autoFocus
        trigger={['click']}
        menu={{
          items: functions.map(name => ({
            key: name,
            disabled: wrapped(name).length > 256,
            label: (
              <span className={styles.functionOption}>
                <code>{name}</code>
                <span>{t(`explore.metricComposition.functions.${name}`)}</span>
              </span>
            )
          })),
          onClick: ({ key }) => {
            onChange(wrapped(key));
            input.current?.focus({ cursor: 'end' });
          }
        }}
      >
        <Button
          aria-label={t('explore.metricComposition.addFunction', { ref: formula.id })}
          title={t('explore.metricComposition.functionHelp')}
        >
          Σ {t('explore.metricComposition.functionLabel')}
        </Button>
      </Dropdown>
      <RemoveFormulaButton formula={formula} onRemove={onRemove} />
    </div>
  );
}

function wrapMetricFunction(name: string, expression: string) {
  const argumentsByName: Record<string, string> = { pow: ', 2', minimum: ', 0', maximum: ', 0' };
  return `${name}(${expression}${argumentsByName[name] ?? ''})`;
}

function RemoveFormulaButton({ formula, onRemove }: { formula: MetricPlan['formulas'][number]; onRemove: () => void }) {
  const { t } = useTranslation();
  return (
    <Button
      type="text"
      icon={<DeleteOutlined />}
      onClick={onRemove}
      aria-label={t('explore.metricComposition.removeFormula', { ref: formula.id })}
      title={t('explore.metricComposition.removeFormula', { ref: formula.id })}
    />
  );
}
