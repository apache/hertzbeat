/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Input, Modal, Segmented } from 'antd';
import type { TFunction } from 'i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import { validationError, validationPath } from '../model/explore-calculated-validation-issue';
import {
  appendCalculatedFormula,
  parseLogCalculatedV2,
  updateCalculatedFormula
} from '../model/explore-log-calculated-v2';
import { ExploreCalculatedExpressionField } from './explore-calculated-expression-field';
import { ExploreLogCalculatedExtractionEditor } from './explore-log-calculated-extraction-editor';
import styles from './explore-log-transaction-editor.module.css';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import type { LogRow } from '../model/explore-signal-contract';

export function ExploreLogCalculatedV2Editor({
  raw,
  editingId,
  search,
  sort,
  analysis,
  validate,
  t,
  onClose,
  onApply,
  sources = [],
  initialExpression,
  contextRow
}: {
  raw: string | undefined;
  editingId?: string;
  search?: string;
  sort?: string | undefined;
  analysis?: string | undefined;
  validate: ValidateCalculatedFields;
  t: TFunction;
  onClose: () => void;
  onApply: (raw: string) => void;
  sources?: LogFacetField[];
  initialExpression?: string;
  contextRow?: LogRow;
}) {
  const editing = parseLogCalculatedV2(raw)?.fields.find(field => field.id === editingId);
  const [kind, setKind] = useState<'formula' | 'extraction'>(
    editing?.kind ?? (initialExpression ? 'formula' : 'extraction')
  );
  const mode = editing?.kind ?? kind;
  const modeControl = editingId ? null : (
    <Segmented
      block
      value={mode}
      onChange={value => setKind(value as 'formula' | 'extraction')}
      options={[
        { value: 'formula', label: t('explore.logCalculatedV2.formula') },
        { value: 'extraction', label: t('explore.logCalculatedV2.extraction') }
      ]}
    />
  );
  if (mode === 'extraction')
    return (
      <ExploreLogCalculatedExtractionEditor
        {...{ raw, editingId, search, sort, analysis, validate, t, onClose, onApply, sources, modeControl }}
      />
    );
  return (
    <FormulaEditor
      {...{ raw, editingId, search, sort, analysis, validate, t, onClose, onApply, modeControl }}
      {...(initialExpression ? { initialExpression } : {})}
      {...(contextRow ? { contextRow } : {})}
    />
  );
}

function FormulaEditor({
  raw,
  editingId,
  search,
  sort,
  analysis,
  validate,
  t,
  onClose,
  onApply,
  modeControl,
  initialExpression,
  contextRow
}: {
  raw: string | undefined;
  editingId?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
  analysis?: string | undefined;
  validate: ValidateCalculatedFields;
  t: TFunction;
  onClose: () => void;
  onApply: (raw: string) => void;
  modeControl: ReactNode;
  initialExpression?: string;
  contextRow?: LogRow;
}) {
  const editor = useCalculatedEditor(
    raw,
    editingId,
    search,
    sort,
    analysis,
    validate,
    onClose,
    onApply,
    initialExpression
  );
  return (
    <Modal
      title={t('explore.logCalculated.mode')}
      open
      onCancel={editor.cancel}
      footer={
        <div className={styles.calculatedActions}>
          <Button onClick={editor.cancel}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            loading={editor.pending}
            disabled={!editor.candidate}
            onClick={() => void editor.save()}
          >
            {t('common.confirm')}
          </Button>
        </div>
      }
    >
      <div className={styles.calculatedEditor}>
        {modeControl}
        <label>
          {t('explore.logCalculated.name')}
          <Input value={editor.name} onChange={event => editor.editName(event.target.value)} />
        </label>
        <ExploreCalculatedExpressionField value={editor.expression} onChange={editor.editExpression} t={t} />
        {contextRow && (
          <details className={styles.logContext}>
            <summary>{t('explore.logFieldMenu.showContextFromLog')}</summary>
            <pre>{JSON.stringify(contextRow, null, 2)}</pre>
          </details>
        )}
        {editor.error && (
          <p role="alert">
            {editor.errorPath && <strong>{t(`explore.logCalculatedV2.validationPaths.${editor.errorPath}`)}: </strong>}
            {t(`explore.logCalculatedV2.${editor.error}`)}
          </p>
        )}
      </div>
    </Modal>
  );
}

function useCalculatedEditor(
  raw: string | undefined,
  editingId: string | undefined,
  search: string | undefined,
  sort: string | undefined,
  analysis: string | undefined,
  validate: ValidateCalculatedFields,
  onClose: () => void,
  onApply: (raw: string) => void,
  initialExpression?: string
) {
  const state = parseLogCalculatedV2(raw);
  const editing = state?.fields.find(field => field.id === editingId && field.kind === 'formula');
  const [name, setName] = useState(
    editing?.kind === 'formula' ? editing.name : `calculated${state?.nextFieldSeq ?? 1}`
  );
  const [expression, setExpression] = useState(
    editing?.kind === 'formula' ? editing.expression : (initialExpression ?? '')
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [errorPath, setErrorPath] = useState<string>();
  const active = useRef<AbortController>();
  const mounted = useRef(true);
  useAbortOnUnmount(active, mounted);
  const candidate = editingId
    ? updateCalculatedFormula(raw, editingId, name.trim(), expression.trim(), search, sort, analysis)
    : appendCalculatedFormula(raw, name.trim(), expression.trim());
  const cancel = () => {
    active.current?.abort();
    onClose();
  };
  const editName = (value: string) => editValue(active, setName, value);
  const editExpression = (value: string) => editValue(active, setExpression, value);
  const save = async () => {
    if (!candidate || pending) return;
    const request = new AbortController();
    active.current = request;
    setPending(true);
    setError(undefined);
    setErrorPath(undefined);
    try {
      const result = await validate(candidate, undefined, request.signal);
      if (request.signal.aborted || !mounted.current) return;
      if (!result.valid) {
        setError(validationError(result.errors));
        setErrorPath(validationPath(result.errors));
        return;
      }
      onApply(candidate);
      onClose();
    } catch {
      if (!request.signal.aborted && mounted.current) setError('unavailable');
    } finally {
      if (mounted.current) setPending(false);
      if (active.current === request) active.current = undefined;
    }
  };
  return { name, expression, pending, error, errorPath, candidate, cancel, editName, editExpression, save };
}

function useAbortOnUnmount(activeRef: { current: AbortController | undefined }, mountedRef: { current: boolean }) {
  useEffect(() => {
    mountedRef.current = true;
    const abort = () => activeRef.current?.abort();
    return () => {
      mountedRef.current = false;
      abort();
    };
  }, [activeRef, mountedRef]);
}

function editValue(active: { current: AbortController | undefined }, set: (value: string) => void, value: string) {
  active.current?.abort();
  set(value);
}
