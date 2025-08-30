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

package org.apache.hertzbeat.manager.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.MetricsFavorite;
import org.apache.hertzbeat.manager.dao.MetricsFavoriteDao;
import org.apache.hertzbeat.manager.service.MetricsFavoriteService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Metrics Favorite Service Implementation
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class MetricsFavoriteServiceImpl implements MetricsFavoriteService {

    private final MetricsFavoriteDao metricsFavoriteDao;

    @Override
    public void addMetricsFavorite(String creator, Long monitorId, String metricsName) {
        Optional<MetricsFavorite> existing = metricsFavoriteDao
                .findByCreatorAndMonitorIdAndMetricsName(creator, monitorId, metricsName);
        if (existing.isPresent()) {
            throw new RuntimeException("Metrics favorite already exists: " + metricsName);
        }
        MetricsFavorite favorite = MetricsFavorite.builder()
                .creator(creator)
                .monitorId(monitorId)
                .metricsName(metricsName)
                .createTime(LocalDateTime.now())
                .build();
        metricsFavoriteDao.save(favorite);
    }

    @Override
    public void removeMetricsFavorite(String userId, Long monitorId, String metricsName) {
        metricsFavoriteDao.deleteByUserIdAndMonitorIdAndMetricsName(userId, monitorId, metricsName);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getUserFavoritedMetrics(String userId, Long monitorId) {
        List<MetricsFavorite> favorites = metricsFavoriteDao.findByCreatorAndMonitorId(userId, monitorId);
        if (null == favorites || favorites.isEmpty()) {
            return Set.of();
        }
        return favorites.stream()
                .map(MetricsFavorite::getMetricsName)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toSet());
    }

    @Override
    public void deleteFavoritesByMonitorIdIn(Set<Long> monitorIds) {
        metricsFavoriteDao.deleteFavoritesByMonitorIdIn(monitorIds);
    }

}