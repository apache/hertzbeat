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

package org.apache.hertzbeat.push.service.impl;

import java.io.InputStream;
import java.time.Instant;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.prometheus.parser.MetricFamily;
import org.apache.hertzbeat.collector.collect.prometheus.parser.OnlineParser;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.apache.hertzbeat.push.service.PushGatewayService;
import org.springframework.stereotype.Service;

/**
 * push gateway service impl
 */

@Slf4j
@Service
public class PushGatewayServiceImpl implements PushGatewayService {
    
    private final CommonDataQueue commonDataQueue;
    
    private final PushMonitorDao pushMonitorDao;
    
    private final Map<String, Long> jobInstanceMap;
    
    public PushGatewayServiceImpl(CommonDataQueue commonDataQueue, PushMonitorDao pushMonitorDao) {
        this.commonDataQueue = commonDataQueue;
        this.pushMonitorDao = pushMonitorDao;
        jobInstanceMap = new ConcurrentHashMap<>();
        pushMonitorDao.findMonitorsByType((byte) 1).forEach(monitor -> 
                jobInstanceMap.put(monitor.getApp() + "_" + monitor.getName(), monitor.getId()));
    }

    @Override
    public boolean pushPrometheusMetrics(InputStream inputStream, String job, String instance) {
        try {
            long curTime = Instant.now().toEpochMilli();
            Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
            if (metricFamilyMap == null) {
                log.error("parse prometheus metrics is null, job: {}, instance: {}", job, instance);
                return false;
            }
            long id = 0L;
            if (job != null && instance != null) {
                // auto create monitor when job and instance not null
                // job is app, instance is the name
                id = jobInstanceMap.computeIfAbsent(job + "_" + instance, key -> {
                    log.info("auto create monitor by prometheus push, job: {}, instance: {}", job, instance);
                    long monitorId = SnowFlakeIdGenerator.generateId();
                    Monitor monitor = Monitor.builder()
                            .id(monitorId)
                            .app(job)
                            .name(instance)
                            .host(instance)
                            .type((byte) 1)
                            .status(CommonConstants.MONITOR_UP_CODE)
                            .build();
                    this.pushMonitorDao.save(monitor);
                    return monitorId;
                });
            }
            for (Map.Entry<String, MetricFamily> entry : metricFamilyMap.entrySet()) {
                CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
                builder.setId(id);
                builder.setApp(job);
                builder.setTime(curTime);
                String metricsName = entry.getKey();
                builder.setMetrics(metricsName);
                MetricFamily metricFamily = entry.getValue();
                if (!metricFamily.getMetricList().isEmpty()) {
                    List<String> metricsFields = new LinkedList<>();
                    for (int index = 0; index < metricFamily.getMetricList().size(); index++) {
                        MetricFamily.Metric metric = metricFamily.getMetricList().get(index);
                        if (index == 0) {
                            metric.getLabels().forEach(label -> {
                                metricsFields.add(label.getName());
                                builder.addField(CollectRep.Field.newBuilder().setName(label.getName())
                                        .setType(CommonConstants.TYPE_STRING).setLabel(true).build());
                            });
                            builder.addField(CollectRep.Field.newBuilder().setName("value")
                                    .setType(CommonConstants.TYPE_NUMBER).setLabel(false).build());
                        }
                        Map<String, String> labelMap = metric.getLabels()
                                .stream()
                                .collect(Collectors.toMap(MetricFamily.Label::getName, MetricFamily.Label::getValue));
                        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                        for (String field : metricsFields) {
                            String fieldValue = labelMap.get(field);
                            valueRowBuilder.addColumn(fieldValue == null ? CommonConstants.NULL_VALUE : fieldValue);
                        }
                        valueRowBuilder.addColumn(String.valueOf(metric.getValue()));
                        builder.addValueRow(valueRowBuilder.build());
                    }
                    commonDataQueue.sendMetricsData(builder.build());
                }
            }
            return true;
        } catch (Exception e) {
            log.error("push prometheus metrics error", e);
            return false;
        }
    }
}
