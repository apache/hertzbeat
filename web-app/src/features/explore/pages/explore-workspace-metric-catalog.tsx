/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
