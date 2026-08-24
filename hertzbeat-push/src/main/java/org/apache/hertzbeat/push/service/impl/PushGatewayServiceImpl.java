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
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.annotation.Nullable;

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

    private static final byte PUSH_MONITOR_TYPE = (byte) 1;

    private final CommonDataQueue commonDataQueue;
    
    private final PushMonitorDao pushMonitorDao;
    
    private final Map<JobInstance, Long> jobInstanceMap;

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
     * <p>The parser materializes its result in memory, and the servlet container does not bound
     * a non form request body, so an independent byte limit is still needed alongside the sample
     * limit to keep long names and label values from exhausting the heap.
     */
    private final long maxBodyBytes;

    /**
     * Cap on how many samples a single push body may carry. The parser stops before allocating
     * a sample beyond this limit, so a compact body cannot create an unbounded object graph.
     */
    private final int maxSamples;

    /**
     * One entry per pair whose monitor is being created, so that concurrent pushes naming the
     * same unknown pair wait for one creation instead of each starting their own. Persistence
     * stays outside any shared lock: a slow database would otherwise hold every request for an
     * unknown pair, and each of those requests is already holding its parsed samples.
     */
    private final Map<JobInstance, CompletableFuture<Long>> monitorCreationMap;

    /**
     * Successful and in flight creations together, so that the cap is claimed before the
     * database write rather than counted after it.
     */
    private final AtomicInteger trackedMonitorCount;

    public PushGatewayServiceImpl(CommonDataQueue commonDataQueue, PushMonitorDao pushMonitorDao,
                                  @Value("${hertzbeat.push.max-auto-created-monitors:10000}") int maxAutoCreatedMonitors,
                                  @Value("${hertzbeat.push.max-body-bytes:5242880}") long maxBodyBytes,
                                  @Value("${hertzbeat.push.max-samples:10000}") int maxSamples) {
        if (maxAutoCreatedMonitors < 0 || maxBodyBytes < 0 || maxSamples < 0) {
            throw new IllegalArgumentException("push gateway limits must not be negative");
        }
        this.commonDataQueue = commonDataQueue;
        this.pushMonitorDao = pushMonitorDao;
        this.maxAutoCreatedMonitors = maxAutoCreatedMonitors;
        this.maxBodyBytes = maxBodyBytes;
        this.maxSamples = maxSamples;
        jobInstanceMap = new ConcurrentHashMap<>();
        pushMonitorDao.findMonitorsByType(PUSH_MONITOR_TYPE).forEach(monitor ->
                jobInstanceMap.put(new JobInstance(monitor.getApp(), monitor.getName()), monitor.getId()));
        monitorCreationMap = new ConcurrentHashMap<>();
        trackedMonitorCount = new AtomicInteger(jobInstanceMap.size());
    }

    @Override
    public boolean pushPrometheusMetrics(InputStream inputStream, String job, String instance) {
        try {
            final long curTime = Instant.now().toEpochMilli();
            final Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(
                    new BoundedInputStream(inputStream, maxBodyBytes), maxSamples);
            if (metricFamilyMap == null) {
                log.error("parse prometheus metrics is null, job: {}, instance: {}", job, instance);
                return false;
            }
            long id = 0L;
            if (job != null && instance != null) {
                // auto create monitor when job and instance not null
                // job is app, instance is the name
                final Long monitorId = resolveMonitorId(new JobInstance(job, instance));
                if (monitorId == null) {
                    return false;
                }
                id = monitorId;
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
                        // A repeated label name is refused rather than resolved: the exposition
                        // format requires the names of a label set to be unique, and keeping one
                        // of the values would emit a schema carrying that name twice. Built by
                        // hand so the refusal is a rejection this method can answer with a
                        // warning, not the error trace a collector's exception would produce.
                        Map<String, String> labelMap = new HashMap<>(metric.getLabels().size());
                        for (MetricFamily.Label label : metric.getLabels()) {
                            if (labelMap.containsKey(label.getName())) {
                                throw new DuplicateLabelException(label.getName());
                            }
                            labelMap.put(label.getName(), label.getValue());
                        }
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
        } catch (BodyTooLargeException e) {
            // A rejection, not a failure: caught apart from the generic handler below so that a
            // caller repeating oversized bodies costs one warning line each, not a stack trace
            log.warn("reject prometheus push over the {} byte body limit, job: {}, instance: {}",
                    maxBodyBytes, job, instance);
            return false;
        } catch (OnlineParser.SampleLimitExceededException e) {
            log.warn("reject prometheus push over the {} sample limit, job: {}, instance: {}",
                    maxSamples, job, instance);
            return false;
        } catch (DuplicateLabelException e) {
            log.warn("reject prometheus push repeating a label name, job: {}, instance: {}: {}",
                    job, instance, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("push prometheus metrics error", e);
            return false;
        }
    }

    /**
     * Returns the monitor id a job/instance pair resolves to, creating the monitor on first
     * sight, or null once {@link #maxAutoCreatedMonitors} is reached.
     *
     * <p>Concurrent pushes naming the same unknown pair share one creation through a future, and
     * the cap is claimed by an atomic count before the database write. Nothing here holds a lock
     * across that write: unrelated pairs persist in parallel, and a slow database delays only the
     * requests naming the pair being created, which matters because every waiting request is
     * holding the samples it already parsed.
     *
     * @param pair Job and instance the push named
     * @return The monitor id, or null when the cap leaves no room for a new one
     */
    @Nullable
    private Long resolveMonitorId(JobInstance pair) {
        final Long known = jobInstanceMap.get(pair);
        if (known != null) {
            return known;
        }

        final CompletableFuture<Long> proposedCreation = new CompletableFuture<>();
        final CompletableFuture<Long> ongoingCreation = monitorCreationMap.putIfAbsent(pair, proposedCreation);
        if (ongoingCreation != null) {
            try {
                return ongoingCreation.join();
            } catch (CompletionException e) {
                // The request owning the creation reports the failure once; joining its exception
                // here would multiply a single database error by every request that waited
                return null;
            }
        }

        try {
            // Looked up again now that the creation is claimed: another request may have finished
            // this pair between the lookup above and this claim, and going on to create it would
            // leave two monitors for one pair and spend a second slot of the cap
            final Long createdMeanwhile = jobInstanceMap.get(pair);
            if (createdMeanwhile != null) {
                proposedCreation.complete(createdMeanwhile);
                return createdMeanwhile;
            }
            if (!reserveMonitorSlot()) {
                proposedCreation.complete(null);
                log.warn("reject prometheus push for unknown job: {}, instance: {}, "
                                + "already tracking {} push monitors, limit is {}",
                        pair.job(), pair.instance(), trackedMonitorCount.get(), maxAutoCreatedMonitors);
                return null;
            }
            boolean created = false;
            try {
                final long monitorId = createMonitor(pair);
                jobInstanceMap.put(pair, monitorId);
                created = true;
                proposedCreation.complete(monitorId);
                return monitorId;
            } finally {
                if (!created) {
                    trackedMonitorCount.decrementAndGet();
                }
            }
        } catch (RuntimeException | Error e) {
            proposedCreation.completeExceptionally(e);
            throw e;
        } finally {
            monitorCreationMap.remove(pair, proposedCreation);
        }
    }

    /**
     * Claims one slot of the cap, or reports that none is left. Claiming before the database
     * write is what keeps concurrent creations from exceeding the cap together.
     */
    private boolean reserveMonitorSlot() {
        int tracked = trackedMonitorCount.get();
        while (tracked < maxAutoCreatedMonitors) {
            if (trackedMonitorCount.compareAndSet(tracked, tracked + 1)) {
                return true;
            }
            tracked = trackedMonitorCount.get();
        }
        return false;
    }

    /**
     * Persists a push monitor after its slot of the cap has been claimed.
     */
    private long createMonitor(JobInstance pair) {
        final String job = pair.job();
        final String instance = pair.instance();
        log.info("auto create monitor by prometheus push, job: {}, instance: {}", job, instance);
        final long monitorId = SnowFlakeIdGenerator.generateId();
        final Monitor monitor = Monitor.builder()
                .id(monitorId)
                .app(job)
                .name(instance)
                .instance(instance)
                .type(PUSH_MONITOR_TYPE)
                .status(CommonConstants.MONITOR_UP_CODE)
                .build();
        this.pushMonitorDao.save(monitor);
        return monitorId;
    }

    /**
     * Identifies the monitor a push belongs to.
     *
     * <p>The two names are kept apart instead of being joined into one string: a separator
     * carries no meaning in either name, so `job + "_" + instance` maps ("a", "b_c") and
     * ("a_b", "c") onto the same key. Colliding pairs would push their samples into whichever
     * monitor was created first, and at startup they would collapse into a single map entry,
     * making the cap count fewer monitors than the database actually holds.
     */
    private record JobInstance(String job, String instance) {
    }

    /**
     * Raised when a sample repeats a label name, which the exposition format does not allow.
     * Kept apart from the generic handler so a malformed body costs one warning line rather
     * than an error trace on a route that takes its input from anyone.
     */
    static final class DuplicateLabelException extends IOException {

        DuplicateLabelException(String name) {
            super("sample repeats the label name " + name);
        }
    }

    /**
     * Raised when a body goes past {@link #maxBodyBytes}. It is kept apart from the other read
     * failures so the caller can answer a body that is merely too large without an error trace.
     */
    static final class BodyTooLargeException extends IOException {

        BodyTooLargeException(long limit) {
            super("push body exceeds the " + limit + " byte limit");
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

        private long bytesRead;

        BoundedInputStream(InputStream delegate, long limit) {
            this.delegate = delegate;
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            final int value = delegate.read();
            if (value != -1) {
                recordBytesRead(1);
            }
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            final int bytesReadNow = delegate.read(buffer, offset, length);
            if (bytesReadNow > 0) {
                recordBytesRead(bytesReadNow);
            }
            return bytesReadNow;
        }

        private void recordBytesRead(int increment) throws IOException {
            bytesRead += increment;
            if (bytesRead > limit) {
                throw new BodyTooLargeException(limit);
            }
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }
    }
}
