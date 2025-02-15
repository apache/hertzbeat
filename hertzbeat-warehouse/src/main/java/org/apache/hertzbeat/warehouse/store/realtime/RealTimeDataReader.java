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

package org.apache.hertzbeat.warehouse.store.realtime;

import java.util.List;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.springframework.lang.NonNull;


/**
 * Real-time data reading class
 */
public interface RealTimeDataReader {

    /**
     * @return data storage available
     */
    boolean isServerAvailable();

    /**
     * query real-time last metrics data
     * @param monitorId monitorId
     * @param metric metric name
     * @return metrics data
     */
    CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric);

    /**
     * query real-time last metrics data
     * @param monitorId monitor id
     * @return metrics data
     */
    List<CollectRep.MetricsData> getCurrentMetricsData(@NonNull Long monitorId);

}
