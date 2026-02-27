/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.collector.collect.prometheus;

import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * Prometheus metrics collector interface
 */
public interface PrometheusCollect {

    /**
     * Collect prometheus metrics data
     * @param builder metrics data builder
     * @param metrics metrics config
     * @return list of metrics data
     */
    List<CollectRep.MetricsData> collect(CollectRep.MetricsData.Builder builder, Metrics metrics);

    /**
     * Get the protocol name this collector supported
     * @return protocol name
     */
    String supportProtocol();
}
