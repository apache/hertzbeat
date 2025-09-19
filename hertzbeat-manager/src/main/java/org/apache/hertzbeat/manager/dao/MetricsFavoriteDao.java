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

package org.apache.hertzbeat.manager.dao;

import org.apache.hertzbeat.common.entity.manager.MetricsFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * MetricsFavorite dao
 */
public interface MetricsFavoriteDao extends JpaRepository<MetricsFavorite, Long> {

    /**
     * Find metrics favorite by creator and monitor id and metrics name
     * 
     * @param creator user id
     * @param monitorId monitor id
     * @param metricsName metrics name
     * @return optional metrics favorite
     */
    Optional<MetricsFavorite> findByCreatorAndMonitorIdAndMetricsName(String creator, Long monitorId, String metricsName);

    /**
     * Find all metrics favorites by user id and monitor id
     * 
     * @param creator user id
     * @param monitorId monitor id
     * @return list of metrics favorites
     */
    List<MetricsFavorite> findByCreatorAndMonitorId(String creator, Long monitorId);

    /**
     * Delete metrics favorite by user id and monitor id and metrics name
     * 
     * @param creator user id
     * @param monitorId monitor id
     * @param metricsName metrics name
     */
    @Modifying
    @Query("DELETE FROM MetricsFavorite mf WHERE mf.creator = :creator AND mf.monitorId = :monitorId AND mf.metricsName = :metricsName")
    void deleteByUserIdAndMonitorIdAndMetricsName(@Param("creator") String creator,
                                                   @Param("monitorId") Long monitorId, 
                                                   @Param("metricsName") String metricsName);

    /**
     * Delete metrics favorites by monitor ids
     *
     * @param monitorIds monitor ids
     */
    @Modifying
    @Query("DELETE FROM MetricsFavorite mf WHERE mf.monitorId IN :monitorIds")
    void deleteFavoritesByMonitorIdIn(@Param("monitorIds") Set<Long> monitorIds);
}