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

package org.apache.hertzbeat.collector.listener;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;

/**
 * 周期任务专用
 */
@Slf4j
@AllArgsConstructor
public class MetricsDataDeliveryListener implements ContextBoundListener<CollectRep.MetricsData.Builder> {
    private CommonDataQueue commonDataQueue;

    @Override
    public void execute(Context context, CollectRep.MetricsData.Builder data) {
        Job job = context.get(ContextKey.JOB);
        CollectRep.MetricsData metricsData = data.build();

        cyclicJobDebugLog(job, metricsData);

        sendToQueue(job, metricsData);
    }

    private void sendToQueue(Job job, CollectRep.MetricsData metricsData) {
        if (job.isSd()) {
            CollectRep.MetricsData sdMetricsData = CollectRep.MetricsData.newBuilder(metricsData).build();
            commonDataQueue.sendServiceDiscoveryData(sdMetricsData);
        }
        commonDataQueue.sendMetricsData(metricsData);
    }

    private void cyclicJobDebugLog(Job job, CollectRep.MetricsData metricsData) {
        if (log.isDebugEnabled()) {
            log.debug("Cyclic Job: {} - {} - {}", job.getMonitorId(), job.getApp(), metricsData.getMetrics());
            metricsDataDebugLog(metricsData);
        }
    }

    private void metricsDataDebugLog(CollectRep.MetricsData metricsData) {
        for (CollectRep.ValueRow valueRow : metricsData.getValues()) {
            for (CollectRep.Field field : metricsData.getFields()) {
                log.debug("Field-->{},Value-->{}", field.getName(), valueRow.getColumns(metricsData.getFields().indexOf(field)));
            }
        }
    }
}
