/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { AlertRulePreviewTable } from './alert-rule-preview-table';
import {
  alertRulePreviewColumns,
  alertRulePreviewMaxCellCharacters,
  alertRulePreviewMaxVisibleColumns
} from '../model/alert-rule-model';

it('keeps every preview row available through bounded client pagination', () => {
  render(
    <AlertRulePreviewTable
      evidence={{
        rowCount: 11,
        rows: Array.from({ length: 11 }, (_value, index) => ({ sample: `sample-${index + 1}` }))
      }}
    />
  );

  expect(screen.getByText('sample-1')).toBeInTheDocument();
  expect(screen.queryByText('sample-11')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle('2'));
  expect(screen.getByText('sample-11')).toBeInTheDocument();
});

it('bounds derived columns and cell text while retaining the original preview rows', () => {
  const row = Object.fromEntries(
    Array.from({ length: alertRulePreviewMaxVisibleColumns + 1 }, (_value, index) => [
      `column-${index}`,
      index === 0 ? 'x'.repeat(alertRulePreviewMaxCellCharacters + 1) : index
    ])
  );
  const rows = [row];
  const columns = alertRulePreviewColumns(rows);

  render(<AlertRulePreviewTable evidence={{ rowCount: rows.length, rows }} />);

  expect(columns).toHaveLength(alertRulePreviewMaxVisibleColumns);
  expect(Object.keys(rows[0] ?? {})).toHaveLength(alertRulePreviewMaxVisibleColumns + 1);
  expect(screen.getByText('alertRules.previewTruncated')).toBeInTheDocument();
  expect(screen.getByText(`${'x'.repeat(alertRulePreviewMaxCellCharacters - 1)}…`)).toBeInTheDocument();
  expect(screen.queryByText(`column-${alertRulePreviewMaxVisibleColumns}`)).not.toBeInTheDocument();
});
