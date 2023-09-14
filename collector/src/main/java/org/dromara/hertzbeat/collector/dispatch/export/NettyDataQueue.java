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

package org.dromara.hertzbeat.collector.dispatch.export;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * for collector instance
 * send collect response data by netty 
 * @author tom
 */
@Configuration
@ConditionalOnProperty(prefix = "common.queue", name = "type", havingValue = "netty")
@Slf4j
public class NettyDataQueue implements CommonDataQueue {
    
    private final CollectJobService collectJobService;
    
    public NettyDataQueue(CollectJobService collectJobService) {
        this.collectJobService = collectJobService;
    }

    @Override
    public void sendAlertsData(Alert alert) {}

    @Override
    public Alert pollAlertsData() throws InterruptedException {
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException {
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToPersistentStorage() throws InterruptedException {
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToRealTimeStorage() throws InterruptedException {
        return null;
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        collectJobService.sendAsyncCollectData(metricsData);
    }
}
