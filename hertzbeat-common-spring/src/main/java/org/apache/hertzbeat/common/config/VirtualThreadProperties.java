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
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.boot.context.properties.bind.Name;

/**
 * Virtual-thread related configuration.
 */
@ConfigurationProperties(prefix = "hertzbeat.vthreads")
public record VirtualThreadProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue PoolProperties collector,
        @DefaultValue PoolProperties common,
        @DefaultValue PoolProperties manager,
        @DefaultValue AlerterProperties alerter,
        @DefaultValue PoolProperties warehouse,
        @DefaultValue AsyncProperties async) {

    private static final int DEFAULT_COLLECTOR_MAX_CONCURRENT_JOBS = 512;

    public VirtualThreadProperties {
        collector = collector == null ? PoolProperties.collectorDefaults() : collector;
        common = common == null ? PoolProperties.commonDefaults() : common;
        manager = manager == null ? PoolProperties.managerDefaults() : manager;
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
            return new PoolProperties(AdmissionMode.LIMIT_AND_REJECT, 10);
        }

        public static PoolProperties alerterNotifyDefaults() {
            return new PoolProperties(AdmissionMode.LIMIT_AND_REJECT, 64);
        }

        private static int defaultCollectorConcurrency() {
            return DEFAULT_COLLECTOR_MAX_CONCURRENT_JOBS;
        }
    }

    /**
     * Alerter-specific executor configuration.
     */
    public record AlerterProperties(
            @Name("notify") @DefaultValue PoolProperties notifyPool,
            @DefaultValue("10") int periodicMaxConcurrentJobs,
            @DefaultValue QueueProperties logWorker,
            @DefaultValue QueueProperties reduce,
            @DefaultValue QueueProperties windowEvaluator,
            @DefaultValue("4") int notifyMaxConcurrentPerChannel) {

        public AlerterProperties {
            notifyPool = notifyPool == null ? PoolProperties.alerterNotifyDefaults() : notifyPool;
            logWorker = logWorker == null ? QueueProperties.logWorkerDefaults() : logWorker;
            reduce = reduce == null ? QueueProperties.reduceDefaults() : reduce;
            windowEvaluator = windowEvaluator == null ? QueueProperties.windowEvaluatorDefaults() : windowEvaluator;
        }

        public AlerterProperties() {
            this(PoolProperties.alerterNotifyDefaults(), 10,
                    QueueProperties.logWorkerDefaults(), QueueProperties.reduceDefaults(),
                    QueueProperties.windowEvaluatorDefaults(), 4);
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

        public AsyncProperties() {
            this(true, 256, true, 5000L);
        }

        public static AsyncProperties defaults() {
            return new AsyncProperties();
        }
    }
}
