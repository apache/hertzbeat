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

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import lombok.Synchronized;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.MetricFamily;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.util.OnlineParser;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.apache.hertzbeat.push.service.PushGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * push gateway service impl
 */

@Slf4j
@Service
public class PushGatewayServiceImpl implements PushGatewayService {

//    List<CollectRep.MetricsData>
    @Autowired
    private PushMonitorDao monitorDao;
    private final CommonDataQueue commonDataQueue;
    Map<String, Lock> createdMonitorNameMap;
    Queue<ImmutablePair<Long, Map<String, MetricFamily>>> metricFamilyQueue;
    public PushGatewayServiceImpl(CommonDataQueue commonDataQueue) {
        this.commonDataQueue = commonDataQueue;
        metricFamilyQueue = new ConcurrentLinkedQueue<>();
        createdMonitorNameMap = new ConcurrentHashMap<>();
    }

    @Scheduled(fixedDelay = 5000)
    private boolean saveMetrics() {
        Long curTime = System.currentTimeMillis();
        ImmutablePair<Long, Map<String, MetricFamily>> head = metricFamilyQueue.peek();
//        List<CollectRep.MetricsData> metricsDataList = new LinkedList<>();
        while (head != null && head.left < curTime) {
            Map<String, MetricFamily> metricFamilyMap = head.right;
            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            for (Map.Entry<String, MetricFamily> entry : metricFamilyMap.entrySet()) {
                builder.clearMetrics();
                builder.clearFields();
                builder.clearValues();
                builder.setTime(head.left);
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
            head = metricFamilyQueue.peek();
        }
    }

    @Override
    public boolean pushMetricsData(InputStream inputStream, String monitorName) throws IOException {
        if (!createdMonitorNameMap.containsKey(monitorName)) {
            createdMonitorNameMap.putIfAbsent(monitorName, new ReentrantLock());
            createdMonitorNameMap.get(monitorName).lock();
            if (!createdMonitorNameMap.containsKey(monitorName)) {
                Optional<Monitor> monitorOptional = monitorDao.findMonitorByNameEquals(monitorName);
                if (!monitorOptional.isPresent()) {
                    Monitor.MonitorBuilder monitorBuilder = Monitor.builder();
                    monitorBuilder.name(monitorName);
                    // todo: other params for monitor to work
                    monitorDao.save(monitorBuilder.build());
                }
            }
            createdMonitorNameMap.get(monitorName).unlock();
        }
        Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(inputStream);
        metricFamilyQueue.add(new ImmutablePair<>(System.currentTimeMillis(), metricFamilyMap));
        return true;
    }
}
