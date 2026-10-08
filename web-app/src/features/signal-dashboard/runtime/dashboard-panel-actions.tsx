/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DashboardPanelRuntimeProps } from '../model/dashboard-panel-runtime-model';
export function DashboardPanelActions({
  actions,
  loading,
  failed
}: {
  actions: NonNullable<DashboardPanelRuntimeProps['actions']>;
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Button size="small" onClick={loading ? actions.cancel : actions.retry}>
        {t(loading ? 'common.cancel' : failed || actions.cancelled ? 'signalDashboard.retryPanel' : 'common.refresh')}
      </Button>
    </div>
  );
}
