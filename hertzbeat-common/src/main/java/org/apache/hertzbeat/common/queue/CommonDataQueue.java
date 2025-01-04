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

package org.apache.hertzbeat.common.queue;

import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * common data queue
 */
public interface CommonDataQueue {

    /**
     * poll collect metrics data for alerter
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollMetricsDataToAlerter() throws InterruptedException;

    /**
     * poll collect metrics data for Persistent Storage
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException;

    /**
     * poll service discovery data
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException;

    /**
     * send collect metrics data
     * @param metricsData metrics data
     */
    void sendMetricsData(CollectRep.MetricsData metricsData);

    /**
     * send metrics data to storage from alerter
     * @param metricsData metrics data
     */
    void sendMetricsDataToStorage(CollectRep.MetricsData metricsData);

    /**
     * send service discovery data
     * @param metricsData service discovery data
     */
    void sendServiceDiscoveryData(CollectRep.MetricsData metricsData);
}
