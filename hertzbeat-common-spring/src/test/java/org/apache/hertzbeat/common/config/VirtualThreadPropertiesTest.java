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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.concurrent.AdmissionMode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;

class VirtualThreadPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(BindingConfig.class);

    @Test
    void defaultsRemainSafeWithoutExternalConfiguration() {
        VirtualThreadProperties properties = VirtualThreadProperties.defaults();

        assertTrue(properties.enabled());

        assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.collector().mode());
        assertEquals(512, properties.collector().maxConcurrentJobs());

        assertEquals(AdmissionMode.UNBOUNDED_VT, properties.common().mode());
        assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.manager().mode());
        assertEquals(10, properties.manager().maxConcurrentJobs());

        assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.alerter().notifyPool().mode());
        assertEquals(64, properties.alerter().notifyPool().maxConcurrentJobs());
        assertEquals(10, properties.alerter().periodicMaxConcurrentJobs());
        assertEquals(10, properties.alerter().logWorker().maxConcurrentJobs());
        assertEquals(1000, properties.alerter().logWorker().queueCapacity());
        assertEquals(2, properties.alerter().reduce().maxConcurrentJobs());
        assertEquals(0, properties.alerter().reduce().queueCapacity());
        assertEquals(2, properties.alerter().windowEvaluator().maxConcurrentJobs());
        assertEquals(0, properties.alerter().windowEvaluator().queueCapacity());
        assertEquals(4, properties.alerter().notifyMaxConcurrentPerChannel());

        assertEquals(AdmissionMode.UNBOUNDED_VT, properties.warehouse().mode());

        assertTrue(properties.async().enabled());
        assertEquals(256, properties.async().concurrencyLimit());
        assertTrue(properties.async().rejectWhenLimitReached());
        assertEquals(5000L, properties.async().taskTerminationTimeout());
    }

    @Test
    void collectorModeOnlyBindingRetainsDefaultConcurrency() {
        contextRunner.withPropertyValues("hertzbeat.vthreads.collector.mode=LIMIT_AND_REJECT")
                .run(context -> {
                    VirtualThreadProperties properties = context.getBean(VirtualThreadProperties.class);
                    assertEquals(AdmissionMode.LIMIT_AND_REJECT, properties.collector().mode());
                    assertEquals(512, properties.collector().maxConcurrentJobs());
                });
    }

    @Test
    void collectorModeOverrideUsesConfiguredMode() {
        contextRunner.withPropertyValues("hertzbeat.vthreads.collector.mode=LIMIT_AND_BLOCK")
                .run(context -> {
                    VirtualThreadProperties properties = context.getBean(VirtualThreadProperties.class);
                    assertEquals(AdmissionMode.LIMIT_AND_BLOCK, properties.collector().mode());
                    assertEquals(512, properties.collector().maxConcurrentJobs());
                });
    }

    @Test
    void notifyModeOnlyBindingRetainsDefaultConcurrency() {
        contextRunner.withPropertyValues("hertzbeat.vthreads.alerter.notify.mode=LIMIT_AND_BLOCK")
                .run(context -> {
                    VirtualThreadProperties properties = context.getBean(VirtualThreadProperties.class);
                    assertEquals(AdmissionMode.LIMIT_AND_BLOCK, properties.alerter().notifyPool().mode());
                    assertEquals(64, properties.alerter().notifyPool().maxConcurrentJobs());
                });
    }

    @Test
    void logWorkerQueueOnlyBindingRetainsDefaultConcurrency() {
        contextRunner.withPropertyValues("hertzbeat.vthreads.alerter.log-worker.queue-capacity=32")
                .run(context -> {
                    VirtualThreadProperties properties = context.getBean(VirtualThreadProperties.class);
                    assertEquals(10, properties.alerter().logWorker().maxConcurrentJobs());
                    assertEquals(32, properties.alerter().logWorker().queueCapacity());
                });
    }

    @EnableConfigurationProperties(VirtualThreadPropertiesBinding.class)
    static class BindingConfig {

        @Bean
        VirtualThreadProperties virtualThreadProperties(VirtualThreadPropertiesBinding binding) {
            return binding.toRuntimeProperties();
        }
    }
}
