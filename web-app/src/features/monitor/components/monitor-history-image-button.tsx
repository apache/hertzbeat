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

import { DownloadOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorHistoryChart } from '../model/monitor-detail-model';
import { saveMonitorHistoryImage } from '../model/monitor-history-image-download';
import type { HistoryChartImage } from './monitor-history-chart';

export function MonitorHistoryImageButton({
  chart,
  image
}: {
  chart: MonitorHistoryChart;
  image: HistoryChartImage | undefined;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const ready =
    image?.chart === chart &&
    chart.result.kind === 'ready' &&
    chart.result.rows.some(series =>
      series.points.some(([time, value]) => Number.isFinite(time) && Number.isFinite(value))
    );
  const download = () => {
    if (!ready || !image) return;
    try {
      saveMonitorHistoryImage(image.exportPng(), chart);
    } catch {
      void message.error(t('monitorMetrics.saveImageError'));
    }
  };
  return (
    <Button
      type="text"
      size="small"
      icon={<DownloadOutlined />}
      disabled={!ready}
      aria-label={t('monitorMetrics.saveImage')}
      title={t('monitorMetrics.saveImage')}
      onClick={download}
    />
  );
}
