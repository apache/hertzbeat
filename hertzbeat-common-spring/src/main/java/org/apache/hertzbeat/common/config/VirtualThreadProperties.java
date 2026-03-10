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

package org.apache.hertzbeat.common.config;

import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.boot.context.properties.bind.Name;

/**
 * Virtual-thread related configuration.
 */
@ConfigurationProperties(prefix = "hertzbeat.vthreads")
public record VirtualThreadProperties(
        @DefaultValue("true") boolean enabled,
        PoolProperties collector,
        PoolProperties common,
        PoolProperties manager,
        AlerterProperties alerter,
        PoolProperties warehouse,
        AsyncProperties async) {

    private static final int DEFAULT_COLLECTOR_MAX_CONCURRENT_JOBS = 512;
    private static final int DEFAULT_MANAGER_MAX_CONCURRENT_JOBS = 10;
    private static final int DEFAULT_NOTIFY_MAX_CONCURRENT_JOBS = 64;
    private static final int DEFAULT_PERIODIC_MAX_CONCURRENT_JOBS = 10;
    private static final int DEFAULT_NOTIFY_MAX_CONCURRENT_PER_CHANNEL = 4;

    @ConstructorBinding
    public VirtualThreadProperties {
        collector = normalizePool(collector, PoolProperties.collectorDefaults());
        common = common == null ? PoolProperties.commonDefaults() : common;
        manager = normalizePool(manager, PoolProperties.managerDefaults());
        alerter = alerter == null ? AlerterProperties.defaults() : alerter;
        warehouse = warehouse == null ? PoolProperties.warehouseDefaults() : warehouse;
        async = async == null ? AsyncProperties.defaults() : async;
    }

    public VirtualThreadProperties() {
        this(true, PoolProperties.collectorDefaults(), PoolProperties.commonDefaults(),
                PoolProperties.managerDefaults(), AlerterProperties.defaults(),
                PoolProperties.warehouseDefaults(), AsyncProperties.defaults());
    }

    /**
     * Create a detached properties instance with runtime defaults.
     *
     * @return defaults instance
     */
    public static VirtualThreadProperties defaults() {
        return new VirtualThreadProperties();
    }

    /**
     * Pool-level configuration.
     */
    public record PoolProperties(
            @DefaultValue("UNBOUNDED_VT") AdmissionMode mode,
            @DefaultValue("0") int maxConcurrentJobs) {

        @ConstructorBinding
        public PoolProperties {
            mode = mode == null ? AdmissionMode.UNBOUNDED_VT : mode;
        }

        public PoolProperties() {
            this(AdmissionMode.UNBOUNDED_VT, 0);
        }

        public static PoolProperties collectorDefaults() {
            return new PoolProperties(AdmissionMode.LIMIT_AND_REJECT, defaultCollectorConcurrency());
        }

        public static PoolProperties warehouseDefaults() {
            return new PoolProperties();
        }

        public static PoolProperties commonDefaults() {
            return new PoolProperties();
        }

        public static PoolProperties managerDefaults() {
            return new PoolProperties(AdmissionMode.LIMIT_AND_REJECT, DEFAULT_MANAGER_MAX_CONCURRENT_JOBS);
        }

        public static PoolProperties alerterNotifyDefaults() {
            return new PoolProperties(AdmissionMode.LIMIT_AND_REJECT, DEFAULT_NOTIFY_MAX_CONCURRENT_JOBS);
        }

        private static int defaultCollectorConcurrency() {
            return DEFAULT_COLLECTOR_MAX_CONCURRENT_JOBS;
        }
    }

    /**
     * Alerter-specific executor configuration.
     */
    public record AlerterProperties(
            @Name("notify") PoolProperties notifyPool,
            @DefaultValue("10") int periodicMaxConcurrentJobs,
            QueueProperties logWorker,
            QueueProperties reduce,
            QueueProperties windowEvaluator,
            @DefaultValue("4") int notifyMaxConcurrentPerChannel) {

        @ConstructorBinding
        public AlerterProperties {
            notifyPool = normalizePool(notifyPool, PoolProperties.alerterNotifyDefaults());
            periodicMaxConcurrentJobs = periodicMaxConcurrentJobs <= 0
                    ? DEFAULT_PERIODIC_MAX_CONCURRENT_JOBS : periodicMaxConcurrentJobs;
            logWorker = normalizeQueue(logWorker, QueueProperties.logWorkerDefaults());
            reduce = normalizeQueue(reduce, QueueProperties.reduceDefaults());
            windowEvaluator = normalizeQueue(windowEvaluator, QueueProperties.windowEvaluatorDefaults());
            notifyMaxConcurrentPerChannel = notifyMaxConcurrentPerChannel <= 0
                    ? DEFAULT_NOTIFY_MAX_CONCURRENT_PER_CHANNEL : notifyMaxConcurrentPerChannel;
        }

        public AlerterProperties() {
            this(PoolProperties.alerterNotifyDefaults(), DEFAULT_PERIODIC_MAX_CONCURRENT_JOBS,
                    QueueProperties.logWorkerDefaults(), QueueProperties.reduceDefaults(),
                    QueueProperties.windowEvaluatorDefaults(), DEFAULT_NOTIFY_MAX_CONCURRENT_PER_CHANNEL);
        }

        public static AlerterProperties defaults() {
            return new AlerterProperties();
        }
    }

    /**
     * Queue-preserving executor configuration.
     */
    public record QueueProperties(
            @DefaultValue("0") int maxConcurrentJobs,
            @DefaultValue("0") int queueCapacity) {

        @ConstructorBinding
        public QueueProperties {
        }

        public QueueProperties() {
            this(0, 0);
        }

        public static QueueProperties reduceDefaults() {
            return new QueueProperties(2, 0);
        }

        public static QueueProperties logWorkerDefaults() {
            return new QueueProperties(10, 1000);
        }

        public static QueueProperties windowEvaluatorDefaults() {
            return new QueueProperties(2, 0);
        }
    }

    /**
     * Async executor configuration.
     */
    public record AsyncProperties(
            @DefaultValue("true") boolean enabled,
            @DefaultValue("256") int concurrencyLimit,
            @DefaultValue("true") boolean rejectWhenLimitReached,
            @DefaultValue("5000") long taskTerminationTimeout) {

        @ConstructorBinding
        public AsyncProperties {
        }

        public AsyncProperties() {
            this(true, 256, true, 5000L);
        }

        public static AsyncProperties defaults() {
            return new AsyncProperties();
        }
    }

    private static PoolProperties normalizePool(PoolProperties configured, PoolProperties defaults) {
        if (configured == null) {
            return defaults;
        }
        if (configured.mode() != AdmissionMode.UNBOUNDED_VT && configured.maxConcurrentJobs() <= 0) {
            return new PoolProperties(configured.mode(), defaults.maxConcurrentJobs());
        }
        return configured;
    }

    private static QueueProperties normalizeQueue(QueueProperties configured, QueueProperties defaults) {
        if (configured == null) {
            return defaults;
        }
        int maxConcurrentJobs = configured.maxConcurrentJobs() <= 0
                ? defaults.maxConcurrentJobs() : configured.maxConcurrentJobs();
        int queueCapacity = configured.queueCapacity();
        if (queueCapacity <= 0 && defaults.queueCapacity() > 0) {
            queueCapacity = defaults.queueCapacity();
        }
        return new QueueProperties(maxConcurrentJobs, queueCapacity);
    }
}
