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
import org.springframework.beans.factory.annotation.Value;
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

    /**
     * Cap on push monitors created automatically from unknown job/instance pairs.
     *
     * <p>The route is unauthenticated by design, and every new pair used to persist a
     * monitor row and add a `jobInstanceMap` entry that is never removed, so a caller
     * iterating over made up names could grow the database and the heap without bound.
     * Above the cap an unknown pair is refused while the pairs already known keep working,
     * which is why eviction is not used here: evicting a live entry would make the next
     * push for that pair create a second monitor for the same job and instance.
     */
    private final int maxAutoCreatedMonitors;

    /**
     * Cap on how many bytes a single push body may carry.
     *
     * <p>`OnlineParser.parseMetrics` builds its result in memory with no limit of its own,
     * and the servlet container does not bound a non form request body, so one unbounded
     * request was enough to exhaust the heap.
     */
    private final long maxBodyBytes;

    /**
     * Cap on how many samples a single push body may carry, applied after parsing so a body
     * that is small on the wire cannot still flood the collection queue.
     */
    private final int maxSamples;

    public PushGatewayServiceImpl(CommonDataQueue commonDataQueue, PushMonitorDao pushMonitorDao,
                                  @Value("${hertzbeat.push.max-auto-created-monitors:10000}") int maxAutoCreatedMonitors,
                                  @Value("${hertzbeat.push.max-body-bytes:5242880}") long maxBodyBytes,
                                  @Value("${hertzbeat.push.max-samples:10000}") int maxSamples) {
        this.commonDataQueue = commonDataQueue;
        this.pushMonitorDao = pushMonitorDao;
        this.maxAutoCreatedMonitors = maxAutoCreatedMonitors;
        this.maxBodyBytes = maxBodyBytes;
        this.maxSamples = maxSamples;
        jobInstanceMap = new ConcurrentHashMap<>();
        pushMonitorDao.findMonitorsByType((byte) 1).forEach(monitor ->
                jobInstanceMap.put(monitor.getApp() + "_" + monitor.getName(), monitor.getId()));
    }

    @Override
    public boolean pushPrometheusMetrics(InputStream inputStream, String job, String instance) {
        try {
            long curTime = Instant.now().toEpochMilli();
            Map<String, MetricFamily> metricFamilyMap =
                    OnlineParser.parseMetrics(new BoundedInputStream(inputStream, maxBodyBytes));
            if (metricFamilyMap == null) {
                log.error("parse prometheus metrics is null, job: {}, instance: {}", job, instance);
                return false;
            }
            int samples = metricFamilyMap.values().stream()
                    .mapToInt(family -> family.getMetricList().size())
                    .sum();
            if (samples > maxSamples) {
                log.warn("reject prometheus push carrying {} samples, limit is {}, job: {}, instance: {}",
                        samples, maxSamples, job, instance);
                return false;
            }
            long id = 0L;
            if (job != null && instance != null) {
                // auto create monitor when job and instance not null
                // job is app, instance is the name
                String key = job + "_" + instance;
                if (!jobInstanceMap.containsKey(key) && jobInstanceMap.size() >= maxAutoCreatedMonitors) {
                    log.warn("reject prometheus push for unknown job: {}, instance: {}, "
                                    + "already tracking {} push monitors, limit is {}",
                            job, instance, jobInstanceMap.size(), maxAutoCreatedMonitors);
                    return false;
                }
                id = jobInstanceMap.computeIfAbsent(key, ignored -> {
                    log.info("auto create monitor by prometheus push, job: {}, instance: {}", job, instance);
                    long monitorId = SnowFlakeIdGenerator.generateId();
                    Monitor monitor = Monitor.builder()
                            .id(monitorId)
                            .app(job)
                            .name(instance)
                            .instance(instance)
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

    /**
     * Fails the read once the body has delivered more than {@code limit} bytes, instead of
     * letting the parser accumulate an unbounded body in memory. Reading stops at the
     * failure, so the bytes beyond the limit are never buffered.
     */
    static final class BoundedInputStream extends InputStream {

        private final InputStream delegate;

        private final long limit;

        private long read;

        BoundedInputStream(InputStream delegate, long limit) {
            this.delegate = delegate;
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            int value = delegate.read();
            if (value != -1) {
                count(1);
            }
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            int count = delegate.read(buffer, offset, length);
            if (count > 0) {
                count(count);
            }
            return count;
        }

        private void count(int increment) throws IOException {
            read += increment;
            if (read > limit) {
                throw new IOException("push body exceeds the " + limit + " byte limit");
            }
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }
    }
}
