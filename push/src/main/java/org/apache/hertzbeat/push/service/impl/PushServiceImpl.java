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

package org.apache.hertzbeat.push.service.impl;


import com.fasterxml.jackson.core.type.TypeReference;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Timer;
import java.util.TimerTask;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.push.PushMetrics;
import org.apache.hertzbeat.common.entity.push.PushMetricsDto;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.push.dao.PushMetricsDao;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.apache.hertzbeat.push.service.PushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * push service impl
 */
@Slf4j
@Service
public class PushServiceImpl implements PushService {

    @Autowired
    private PushMonitorDao monitorDao;

    @Autowired
    private PushMetricsDao metricsDao;

    private final Map<Long, Long> monitorIdCache; // key: monitorId, value: time stamp of last query

    private static final long cacheTimeout = 5000L; // ms

    private final Map<Long, PushMetricsDto.Metrics> lastPushMetrics;

    private static final long deleteMetricsPeriod = 1000 * 60 * 60 * 12L;

    private static final long deleteBeforeTime = deleteMetricsPeriod / 2;

    public PushServiceImpl(){
        monitorIdCache = new HashMap<>();
        lastPushMetrics = new HashMap<>();

        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                try {
                    deletePeriodically();
                } catch (Exception e) {
                    log.error("periodical deletion failed. {}", e.getMessage());
                }
            }
        }, 1000, deleteMetricsPeriod);
    }

    public void deletePeriodically(){
        metricsDao.deleteAllByTimeBefore(System.currentTimeMillis() - deleteBeforeTime);
    }

    @Override
    public void pushMetricsData(PushMetricsDto pushMetricsDto) throws RuntimeException {
        List<PushMetrics> pushMetricsList = new ArrayList<>();
        long curTime = System.currentTimeMillis();
        for (PushMetricsDto.Metrics metrics : pushMetricsDto.getMetricsList()) {
            long monitorId = metrics.getMonitorId();
            metrics.setTime(curTime);

            if (!monitorIdCache.containsKey(monitorId) || (monitorIdCache.containsKey(monitorId) && curTime > monitorIdCache.get(monitorId) + cacheTimeout)) {
                Optional<Monitor> queryOption = monitorDao.findById(monitorId);
                if (queryOption.isEmpty()) {
                    monitorIdCache.remove(monitorId);
                    continue;
                }
                monitorIdCache.put(monitorId, curTime);
            }

            PushMetrics pushMetrics = PushMetrics.builder()
                    .monitorId(metrics.getMonitorId())
                    .time(curTime)
                    .metrics(JsonUtil.toJson(metrics.getMetrics())).build();
            lastPushMetrics.put(monitorId, metrics);
            pushMetricsList.add(pushMetrics);
        }

        metricsDao.saveAll(pushMetricsList);

    }

    @Override
    public PushMetricsDto getPushMetricData(final Long monitorId, final Long time) {
        PushMetricsDto.Metrics metrics;
        PushMetricsDto pushMetricsDto = new PushMetricsDto();
        if (lastPushMetrics.containsKey(monitorId)) {
            metrics = lastPushMetrics.get(monitorId);
        }
        else {
            try {
                PushMetrics pushMetrics = metricsDao.findFirstByMonitorIdOrderByTimeDesc(monitorId);
                if (pushMetrics == null || pushMetrics.getMetrics() == null) {
                    return pushMetricsDto;
                }
                List<Map<String, String>> jsonMap = JsonUtil.fromJson(pushMetrics.getMetrics(), new TypeReference<>() {
                });
                metrics = PushMetricsDto.Metrics.builder().monitorId(monitorId).metrics(jsonMap).time(pushMetrics.getTime()).build();
                lastPushMetrics.put(monitorId, metrics);
            }
            catch (Exception e) {
                log.error("no metrics found, monitor id: {}, {}", monitorId, e.getMessage(), e);
                return pushMetricsDto;
            }
        }
        if (time > metrics.getTime()) {
            // return void because time param is invalid
            return pushMetricsDto;
        }
        pushMetricsDto.getMetricsList().add(metrics);
        return pushMetricsDto;
    }

}
