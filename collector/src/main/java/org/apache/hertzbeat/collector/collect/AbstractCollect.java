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

package org.apache.hertzbeat.collector.collect;

import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * Specific metrics collection implementation abstract class
 */
public abstract class AbstractCollect {

    /**
     * Pre-check metrics
     * @param metrics metric configuration
     * @throws IllegalArgumentException when validation failed
     */
    public abstract void preCheck(Metrics metrics) throws IllegalArgumentException;


    /**
     * Real acquisition implementation interface
     * @param builder response builder
     * @param monitorId  monitor id   
     * @param app monitor type 
     * @param metrics metric configuration
     */
    public abstract void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics);

    /**
     * the protocol this collect instance support
     * @return protocol str
     */
    public abstract String supportProtocol();
}
