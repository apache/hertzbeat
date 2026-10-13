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

import { useState } from 'react';

export type MetricResultDisplay = 'chart' | 'table';
const STORAGE_KEY = 'hertzbeat.explore.metrics.display';

function readMetricDisplay(): MetricResultDisplay {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'table' ? 'table' : 'chart';
  } catch {
    return 'chart';
  }
}

export function useMetricResultDisplay() {
  const [display, setDisplay] = useState(readMetricDisplay);
  const updateDisplay = (next: MetricResultDisplay) => {
    setDisplay(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage is optional; the active view still owns the display preference.
    }
  };
  return [display, updateDisplay] as const;
}
