/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { StarFilled, StarOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';

export function RealtimeFavoriteButton({
  group,
  onToggle
}: {
  group: MonitorMetricWorkbenchController['state']['realtimeGroups'][number];
  onToggle: MonitorMetricWorkbenchController['actions']['toggleRealtimeFavorite'];
}) {
  const { t } = useTranslation();
  const favorited = group.favorite.kind === 'ready' && group.favorite.value;
  return (
    <Button
      type="text"
      size="small"
      icon={favorited ? <StarFilled /> : <StarOutlined />}
      aria-label={t(favorited ? 'monitorMetrics.unfavorite' : 'monitorMetrics.favorite')}
      disabled={group.favorite.kind !== 'ready' || group.favoriteBusy}
      loading={group.favoriteBusy}
      onClick={() => void onToggle(group.group)}
      data-realtime-favorite-group={group.group}
    />
  );
}
