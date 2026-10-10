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

import { expect, it, vi } from 'vitest';
import { formatCurrency } from '@perses-dev/components/dist/model/currency';
import { getTraceModel } from '@perses-dev/tracing-gantt-chart-plugin/lib/TracingGanttChart/trace';

const cjsCurrency = await vi.importActual<{ formatCurrency: typeof formatCurrency }>(
  '@perses-dev/components/dist/cjs/model/currency'
);
const cjsTrace = await vi.importActual<{ getTraceModel: typeof getTraceModel }>(
  '@perses-dev/tracing-gantt-chart-plugin/lib/cjs/TracingGanttChart/trace'
);

it.each([formatCurrency, cjsCurrency.formatCurrency])(
  'retains lowercase currency conversion through the locked lodash function',
  format => {
    expect(format(12.5, { unit: 'usd', decimalPlaces: 2 })).toBe('$12.50');
    expect(format(-2, { unit: 'eur', decimalPlaces: 2 })).toBe('-€2.00');
  }
);

it.each([getTraceModel, cjsTrace.getTraceModel])(
  'retains chronological child insertion through the locked lodash function',
  getModel => {
    const span = (spanId: string, start: string, parentSpanId = '') => ({
      traceId: 'trace',
      spanId,
      parentSpanId,
      name: spanId,
      kind: 'SPAN_KIND_INTERNAL',
      startTimeUnixNano: start,
      endTimeUnixNano: '9000000'
    });
    const model = getModel({
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                span('parent', '1000000'),
                span('later', '7000000', 'parent'),
                span('earlier', '2000000', 'parent')
              ]
            }
          ]
        }
      ]
    });
    expect(model.rootSpans).toHaveLength(1);
    expect(model.rootSpans[0]?.childSpans.map(child => child.spanId)).toEqual(['earlier', 'later']);
  }
);
