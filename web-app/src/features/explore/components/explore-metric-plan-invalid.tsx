/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
export function ExploreMetricPlanInvalid({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <p>{t('explore.metricComposition.invalidPlan')}</p>
      <Button onClick={reset}>{t('explore.metricComposition.resetPlan')}</Button>
    </div>
  );
}
