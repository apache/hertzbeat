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

import type { ReactNode } from 'react';
import { Button, Input, Modal } from 'antd';
import type { TFunction } from 'i18next';
import type { ValidateCalculatedFields } from '../model/explore-calculated-validation-contract';
import type { LogRow } from '../model/explore-signal-contract';
import { ExploreCalculatedExpressionField } from './explore-calculated-expression-field';
import { useCalculatedEditor } from './use-calculated-formula-editor';
import styles from './explore-log-transaction-editor.module.css';

export function FormulaEditor({
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
      footer={<FormulaActions editor={editor} t={t} />}
    >
      <div className={styles.calculatedEditor}>
        {modeControl}
        <FormulaInputs editor={editor} t={t} contextRow={contextRow} />
      </div>
    </Modal>
  );
}

function FormulaInputs({
  editor,
  t,
  contextRow
}: {
  editor: ReturnType<typeof useCalculatedEditor>;
  t: TFunction;
  contextRow: LogRow | undefined;
}) {
  return (
    <>
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
    </>
  );
}

function FormulaActions({ editor, t }: { editor: ReturnType<typeof useCalculatedEditor>; t: TFunction }) {
  return (
    <div className={styles.calculatedActions}>
      <Button onClick={editor.cancel}>{t('common.cancel')}</Button>
      <Button type="primary" loading={editor.pending} disabled={!editor.candidate} onClick={() => void editor.save()}>
        {t('common.confirm')}
      </Button>
    </div>
  );
}
