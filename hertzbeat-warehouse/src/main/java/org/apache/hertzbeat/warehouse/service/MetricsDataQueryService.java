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

package org.apache.hertzbeat.warehouse.service;

import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;

import java.util.List;

/**
 * metrics data query service
 */
public interface MetricsDataQueryService {
    
    /**
     * Query metrics data
     * @param queries query expr
     * @param time time
     * @return data
     */
    List<MetricQueryData> query(List<String> queries, String queryType, Long time);

    /**
     * Query metrics data range
     * @param queries query expr
     * @param start start
     * @param end end
     * @param step step
     * @return data
     */
    List<MetricQueryData> queryRange(List<String> queries, String queryType, Long start, Long end, String step);
}
