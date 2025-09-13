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

package org.apache.hertzbeat.manager.service;

import java.util.Set;

/**
 * Metrics Favorite Service
 */
public interface MetricsFavoriteService {

    /**
     * Add metrics to favorites
     * 
     * @param creator user id
     * @param monitorId monitor id
     * @param metricsName metrics name
     */
    void addMetricsFavorite(String creator, Long monitorId, String metricsName);

    /**
     * Remove metrics from favorites
     * 
     * @param userId user id
     * @param monitorId monitor id
     * @param metricsName metrics name
     */
    void removeMetricsFavorite(String userId, Long monitorId, String metricsName);

    /**
     * Get user's favorited metrics names for a specific monitor
     * 
     * @param userId user id
     * @param monitorId monitor id
     * @return set of favorited metrics names
     */
    Set<String> getUserFavoritedMetrics(String userId, Long monitorId);

    /**
     * Remove metrics from monitor ids
     *
     * @param monitorIds monitor ids
     */
    void deleteFavoritesByMonitorIdIn(Set<Long> monitorIds);
}