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

package com.usthe.common.queue;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.message.CollectRep;

/**
 * common data queue
 * @author tom
 * @date 2021/11/24 17:58
 */
public interface CommonDataQueue {

    /**
     * offer alert data
     * @param alert alert data
     */
    void addAlertData(Alert alert);

    /**
     * poll alert data
     * @return alert data
     * @throws InterruptedException when poll timeout
     */
    Alert pollAlertData() throws InterruptedException;

    /**
     * poll collect metrics data for alerter
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollAlertMetricsData() throws InterruptedException;

    /**
     * poll collect metrics data for Persistent Storage
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollPersistentStorageMetricsData() throws InterruptedException;

    /**
     * poll collect metrics data for real-time Storage
     * @return metrics data
     * @throws InterruptedException when poll timeout
     */
    CollectRep.MetricsData pollRealTimeStorageMetricsData() throws InterruptedException;

    /**
     * send collect metrics data
     * @param metricsData metrics data
     */
    void sendMetricsData(CollectRep.MetricsData metricsData);
}
