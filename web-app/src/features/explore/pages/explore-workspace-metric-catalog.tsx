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

import type { TFunction } from 'i18next';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useMetricPlanEditor } from '../controller/use-metric-plan-editor';
import type { useMetricInventory } from '../controller/use-metric-inventory';
import { ExploreMetricCatalog } from '../components/explore-metric-catalog';
import { metricPlanFromQuery } from '@/platform/perses';
import type { draftFromQuery } from '../model/explore-submission-model';
export function WorkspaceMetricCatalog({
  controller,
  metricEditor,
  inventory,
  t
}: {
  controller: ReturnType<typeof useExplorePageController>;
  metricEditor: ReturnType<typeof useMetricPlanEditor>;
  inventory: ReturnType<typeof useMetricInventory>;
  t: TFunction;
}) {
  return (
    <ExploreMetricCatalog
      model={inventory}
      draftMetric={
        metricEditor && !metricEditor.invalid
          ? (metricEditor.plan.queries.find(row => row.refId === metricEditor.activeRef)?.metric ?? '')
          : controller.submission.draft.query
      }
      committedMetric={committedMetricName(controller.query, metricEditor)}
      select={name =>
        metricEditor && !metricEditor.invalid
          ? metricEditor.select(name)
          : controller.submission.updateField({ field: 'query', value: name })
      }
      t={t}
    />
  );
}

function committedMetricName(
  query: Parameters<typeof draftFromQuery>[0],
  editor: ReturnType<typeof useMetricPlanEditor>
) {
  if (query.signal !== 'metrics') return undefined;
  try {
    return metricPlanFromQuery(query).queries.find(
      row => row.refId === (editor && !editor.invalid ? editor.activeRef : 'a')
    )?.metric;
  } catch {
    return undefined;
  }
}
