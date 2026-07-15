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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.collector.dispatch.CollectorRuntimeStatusProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class OtelRuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(OtelRuntimeConfiguration.class));

    @Test
    void remainsStoppedByDefaultWhileKeepingRuntimeEnablementAvailable() {
        contextRunner.run(context -> {
            assertTrue(context.isRunning());
            OtelRuntimeSupervisor supervisor = context.getBean(OtelRuntimeSupervisor.class);
            assertEquals(OtelRuntimeState.STOPPED, supervisor.snapshot().state());
            assertTrue(context.getBean(CollectorRuntimeStatusProvider.class) instanceof OtelRuntimeStatusProvider);
        });
    }

    @Test
    void missingOptionalRuntimeDegradesWithoutFailingJavaCollectorContext() {
        contextRunner
                .withPropertyValues(
                        "collector.otel-runtime.enabled=true",
                        "collector.otel-runtime.restart-delay=1h",
                        "collector.otel-runtime.collector-id=edge-test",
                        "collector.otel-runtime.token=test-intake-token",
                        "collector.otel-runtime.home=/path/that/does/not/exist"
                )
                .run(context -> {
                    assertTrue(context.isRunning());
                    assertTrue(context.containsBean("otelRuntimeSupervisor"));
                    OtelRuntimeSupervisor supervisor = context.getBean(OtelRuntimeSupervisor.class);
                    assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
                });
    }

    @Test
    void bindsManagedPrometheusAndFileLogSourceIntent() {
        contextRunner
                .withPropertyValues(
                        "collector.otel-runtime.prometheus-targets[0].name=payments",
                        "collector.otel-runtime.prometheus-targets[0].endpoint=http://127.0.0.1:9464/metrics",
                        "collector.otel-runtime.prometheus-targets[0].interval=30s",
                        "collector.otel-runtime.file-log-sources[0].name=payments",
                        "collector.otel-runtime.file-log-sources[0].path-profile=payments-logs",
                        "collector.otel-runtime.file-log-allow-roots[0]=/var/log",
                        "collector.otel-runtime.file-log-profiles.payments-logs[0]=/var/log/payments/*.log"
                )
                .run(context -> {
                    assertTrue(context.isRunning());
                    OtelRuntimeProperties properties = context.getBean(OtelRuntimeProperties.class);
                    assertEquals("payments", properties.getPrometheusTargets().getFirst().name());
                    assertEquals("payments-logs", properties.getFileLogSources().getFirst().pathProfile());
                    assertEquals("/var/log/payments/*.log",
                            properties.getFileLogProfiles().get("payments-logs").getFirst());
                });
    }
}
