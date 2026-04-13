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
 * Spring Boot binding adapter for {@link VirtualThreadProperties}.
 */
@ConfigurationProperties(prefix = "hertzbeat.vthreads")
public record VirtualThreadPropertiesBinding(
        @DefaultValue("true") boolean enabled,
        PoolProperties collector,
        PoolProperties common,
        PoolProperties manager,
        AlerterProperties alerter,
        PoolProperties warehouse,
        AsyncProperties async) {

    @ConstructorBinding
    public VirtualThreadPropertiesBinding {
        VirtualThreadProperties runtimeProperties = new VirtualThreadProperties(enabled,
                toRuntimePool(collector),
                toRuntimePool(common),
                toRuntimePool(manager),
                toRuntimeAlerter(alerter),
                toRuntimePool(warehouse),
                toRuntimeAsync(async));
        enabled = runtimeProperties.enabled();
        collector = PoolProperties.fromRuntime(runtimeProperties.collector());
        common = PoolProperties.fromRuntime(runtimeProperties.common());
        manager = PoolProperties.fromRuntime(runtimeProperties.manager());
        alerter = AlerterProperties.fromRuntime(runtimeProperties.alerter());
        warehouse = PoolProperties.fromRuntime(runtimeProperties.warehouse());
        async = AsyncProperties.fromRuntime(runtimeProperties.async());
    }

    public VirtualThreadProperties toRuntimeProperties() {
        return new VirtualThreadProperties(enabled,
                toRuntimePool(collector),
                toRuntimePool(common),
                toRuntimePool(manager),
                toRuntimeAlerter(alerter),
                toRuntimePool(warehouse),
                toRuntimeAsync(async));
    }

    /**
     * Pool-level binding model.
     */
    public record PoolProperties(
            @DefaultValue("UNBOUNDED_VT") AdmissionMode mode,
            @DefaultValue("0") int maxConcurrentJobs) {

        @ConstructorBinding
        public PoolProperties {
            mode = mode == null ? AdmissionMode.UNBOUNDED_VT : mode;
        }

        static PoolProperties fromRuntime(VirtualThreadProperties.PoolProperties runtimeProperties) {
            return runtimeProperties == null ? null
                    : new PoolProperties(runtimeProperties.mode(), runtimeProperties.maxConcurrentJobs());
        }
    }

    /**
     * Alerter-specific binding model.
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
        }

        static AlerterProperties fromRuntime(VirtualThreadProperties.AlerterProperties runtimeProperties) {
            return runtimeProperties == null ? null
                    : new AlerterProperties(
                    PoolProperties.fromRuntime(runtimeProperties.notifyPool()),
                    runtimeProperties.periodicMaxConcurrentJobs(),
                    QueueProperties.fromRuntime(runtimeProperties.logWorker()),
                    QueueProperties.fromRuntime(runtimeProperties.reduce()),
                    QueueProperties.fromRuntime(runtimeProperties.windowEvaluator()),
                    runtimeProperties.notifyMaxConcurrentPerChannel());
        }
    }

    /**
     * Queue-preserving binding model.
     */
    public record QueueProperties(
            @DefaultValue("0") int maxConcurrentJobs,
            @DefaultValue("0") int queueCapacity) {

        @ConstructorBinding
        public QueueProperties {
        }

        static QueueProperties fromRuntime(VirtualThreadProperties.QueueProperties runtimeProperties) {
            return runtimeProperties == null ? null
                    : new QueueProperties(runtimeProperties.maxConcurrentJobs(), runtimeProperties.queueCapacity());
        }
    }

    /**
     * Async executor binding model.
     */
    public record AsyncProperties(
            @DefaultValue("true") boolean enabled,
            @DefaultValue("256") int concurrencyLimit,
            @DefaultValue("true") boolean rejectWhenLimitReached,
            @DefaultValue("5000") long taskTerminationTimeout) {

        @ConstructorBinding
        public AsyncProperties {
        }

        static AsyncProperties fromRuntime(VirtualThreadProperties.AsyncProperties runtimeProperties) {
            return runtimeProperties == null ? null
                    : new AsyncProperties(runtimeProperties.enabled(), runtimeProperties.concurrencyLimit(),
                    runtimeProperties.rejectWhenLimitReached(), runtimeProperties.taskTerminationTimeout());
        }
    }

    private static VirtualThreadProperties.PoolProperties toRuntimePool(PoolProperties poolProperties) {
        return poolProperties == null ? null
                : new VirtualThreadProperties.PoolProperties(poolProperties.mode(), poolProperties.maxConcurrentJobs());
    }

    private static VirtualThreadProperties.AlerterProperties toRuntimeAlerter(AlerterProperties alerterProperties) {
        return alerterProperties == null ? null
                : new VirtualThreadProperties.AlerterProperties(
                toRuntimePool(alerterProperties.notifyPool()),
                alerterProperties.periodicMaxConcurrentJobs(),
                toRuntimeQueue(alerterProperties.logWorker()),
                toRuntimeQueue(alerterProperties.reduce()),
                toRuntimeQueue(alerterProperties.windowEvaluator()),
                alerterProperties.notifyMaxConcurrentPerChannel());
    }

    private static VirtualThreadProperties.QueueProperties toRuntimeQueue(QueueProperties queueProperties) {
        return queueProperties == null ? null
                : new VirtualThreadProperties.QueueProperties(queueProperties.maxConcurrentJobs(),
                queueProperties.queueCapacity());
    }

    private static VirtualThreadProperties.AsyncProperties toRuntimeAsync(AsyncProperties asyncProperties) {
        return asyncProperties == null ? null
                : new VirtualThreadProperties.AsyncProperties(asyncProperties.enabled(),
                asyncProperties.concurrencyLimit(), asyncProperties.rejectWhenLimitReached(),
                asyncProperties.taskTerminationTimeout());
    }
}
