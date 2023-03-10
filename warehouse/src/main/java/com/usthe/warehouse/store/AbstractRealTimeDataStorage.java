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

package com.usthe.warehouse.store;

import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.lang.NonNull;

/**
 * 实时数据存储抽象类
 * @author tom
 * @date 2021/11/25 10:26
 */
@Slf4j
public abstract class AbstractRealTimeDataStorage implements DisposableBean {

    /**
     * save collect metrics data
     * @param metricsData metrics data
     */
    abstract void saveData(CollectRep.MetricsData metricsData);

    /**
     * query real-time last metrics data
     * @param monitorId monitorId
     * @param metric metric name
     * @return metrics data
     */
    public abstract CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric);
}
