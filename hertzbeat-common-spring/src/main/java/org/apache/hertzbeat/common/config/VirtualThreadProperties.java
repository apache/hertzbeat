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

import lombok.Getter;
import lombok.Setter;
import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Virtual-thread related configuration.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "hertzbeat.vthreads")
public class VirtualThreadProperties {

    private static final int DEFAULT_COLLECTOR_MAX_CONCURRENT_JOBS = 512;

    private boolean enabled = true;

    private PoolProperties collector = PoolProperties.collectorDefaults();

    private PoolProperties common = PoolProperties.commonDefaults();

    private PoolProperties manager = PoolProperties.managerDefaults();

    private AlerterProperties alerter = new AlerterProperties();

    private PoolProperties warehouse = PoolProperties.warehouseDefaults();

    private AsyncProperties async = new AsyncProperties();

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
    @Getter
    @Setter
    public static class PoolProperties {

        private AdmissionMode mode = AdmissionMode.UNBOUNDED_VT;

        private int maxConcurrentJobs;

        private static PoolProperties collectorDefaults() {
            PoolProperties properties = new PoolProperties();
            properties.setMode(AdmissionMode.LIMIT_AND_REJECT);
            properties.setMaxConcurrentJobs(defaultCollectorConcurrency());
            return properties;
        }

        private static PoolProperties warehouseDefaults() {
            return new PoolProperties();
        }

        private static PoolProperties commonDefaults() {
            return new PoolProperties();
        }

        private static PoolProperties managerDefaults() {
            PoolProperties properties = new PoolProperties();
            properties.setMode(AdmissionMode.LIMIT_AND_REJECT);
            properties.setMaxConcurrentJobs(10);
            return properties;
        }

        private static PoolProperties alerterNotifyDefaults() {
            PoolProperties properties = new PoolProperties();
            properties.setMode(AdmissionMode.LIMIT_AND_REJECT);
            properties.setMaxConcurrentJobs(64);
            return properties;
        }

        private static int defaultCollectorConcurrency() {
            return DEFAULT_COLLECTOR_MAX_CONCURRENT_JOBS;
        }
    }

    /**
     * Alerter-specific executor configuration.
     */
    @Getter
    @Setter
    public static class AlerterProperties {

        private PoolProperties notify = PoolProperties.alerterNotifyDefaults();

        private int periodicMaxConcurrentJobs = 10;

        private QueueProperties logWorker = QueueProperties.logWorkerDefaults();

        private QueueProperties reduce = QueueProperties.reduceDefaults();

        private QueueProperties windowEvaluator = QueueProperties.windowEvaluatorDefaults();

        private int notifyMaxConcurrentPerChannel = 4;
    }

    /**
     * Queue-preserving executor configuration.
     */
    @Getter
    @Setter
    public static class QueueProperties {

        private int maxConcurrentJobs;

        private int queueCapacity;

        private static QueueProperties reduceDefaults() {
            QueueProperties properties = new QueueProperties();
            properties.setMaxConcurrentJobs(2);
            return properties;
        }

        private static QueueProperties logWorkerDefaults() {
            QueueProperties properties = new QueueProperties();
            properties.setMaxConcurrentJobs(10);
            properties.setQueueCapacity(1000);
            return properties;
        }

        private static QueueProperties windowEvaluatorDefaults() {
            QueueProperties properties = new QueueProperties();
            properties.setMaxConcurrentJobs(2);
            return properties;
        }
    }

    /**
     * Async executor configuration.
     */
    @Getter
    @Setter
    public static class AsyncProperties {

        private boolean enabled = true;

        private int concurrencyLimit = 256;

        private boolean rejectWhenLimitReached = true;

        private long taskTerminationTimeout = 5000L;
    }
}
