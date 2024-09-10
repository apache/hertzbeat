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

package org.apache.hertzbeat.collector.dispatch;

import org.apache.hertzbeat.collector.dispatch.timer.Timeout;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * Collection data scheduler interface
 */
public interface CollectDataDispatch {

    /**
     * Processing and distributing collection result data
     * @param timeout     time wheel timeout        
     * @param metrics     The following metrics collection tasks   
     * @param metricsData Collect result data       
     */
    void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData);

    /**
     * Processing and distributing collection result data
     *
     * @param timeout     time wheel timeout        
     * @param metrics     The following metrics collection tasks    
     * @param metricsDataList Collect result data       
     */
    void dispatchCollectData(Timeout timeout, Metrics metrics, List<CollectRep.MetricsData> metricsDataList);

}
