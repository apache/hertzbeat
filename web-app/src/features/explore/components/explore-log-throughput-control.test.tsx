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

import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { DEFAULT_LOG_ANALYSIS, type LogAnalysisState } from '@/platform/perses';
import { ExploreLogThroughputControl } from './explore-log-throughput-control';
import { ExploreLogAnalysisRepresentations } from './explore-log-analysis-controls';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('stages throughput and requires None before switching views', () => {
  const query = vi.fn();
  function Subject() {
    const [value, setValue] = useState<LogAnalysisState>({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' });
    return (
      <>
        <ExploreLogThroughputControl value={value} onChange={setValue} t={t} />
        <ExploreLogAnalysisRepresentations
          value={value.representation}
          transform={value.transform}
          onChange={query}
          t={t}
        />
      </>
    );
  }
  render(<Subject />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logAnalysis.throughput'));
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.logs' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.timeseries' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.table' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.toplist' })).not.toBeInTheDocument();
  expect(query).not.toHaveBeenCalled();
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logAnalysis.transformNone'));
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.logs' }));
  expect(query).toHaveBeenCalledWith('logs');
});
