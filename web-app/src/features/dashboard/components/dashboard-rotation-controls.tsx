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

import { Button } from 'antd';
import { LeftOutlined, RightOutlined, PauseOutlined, CaretRightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { DashboardRotation } from '../model/dashboard-signals';
import styles from './dashboard-signals.module.css';
export function DashboardRotationControls({ signals }: { signals: DashboardRotation }) {
  const { t } = useTranslation();
  return (
    <div className={styles.rotationGroup}>
      <div className={styles.rotationControls}>
        <span className={styles.position}>
          {signals.activeIndex + 1}/{signals.metricCount}
        </span>
        {signals.metricCount > 1 && (
          <>
            <Button
              type="text"
              size="small"
              aria-label={t('dashboard.v2.previous')}
              icon={<LeftOutlined />}
              onClick={signals.previousMetric}
            />
            <Button
              type="text"
              size="small"
              aria-label={t(signals.metricPaused ? 'dashboard.v2.resume' : 'dashboard.v2.pause')}
              aria-pressed={signals.metricPaused}
              icon={signals.metricPaused ? <CaretRightOutlined /> : <PauseOutlined />}
              onClick={() => signals.setMetricPaused(!signals.metricPaused)}
            />
            <Button
              type="text"
              size="small"
              aria-label={t('dashboard.v2.next')}
              icon={<RightOutlined />}
              onClick={signals.nextMetric}
            />
          </>
        )}
      </div>
    </div>
  );
}
