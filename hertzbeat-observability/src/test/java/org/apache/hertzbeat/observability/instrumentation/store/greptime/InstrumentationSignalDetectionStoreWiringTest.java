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

package org.apache.hertzbeat.observability.instrumentation.store.greptime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.observability.instrumentation.store.InstrumentationSignalDetectionStore;
import org.apache.hertzbeat.observability.instrumentation.store.UnavailableInstrumentationSignalDetectionStore;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

class InstrumentationSignalDetectionStoreWiringTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(DetectionStoreConfiguration.class);

    @Test
    void injectsProductionAdapterWhenGreptimeAndItsExecutorAreAvailable() {
        contextRunner
                .withPropertyValues("warehouse.store.greptime.enabled=true")
                .withBean(GreptimeSqlQueryExecutor.class, () -> mock(GreptimeSqlQueryExecutor.class))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(GreptimeInstrumentationSignalDetectionStore.class);
                    assertThat(context).hasSingleBean(UnavailableInstrumentationSignalDetectionStore.class);
                    assertThat(context.getBean(InstrumentationSignalDetectionStore.class))
                            .isInstanceOf(GreptimeInstrumentationSignalDetectionStore.class);
                });
    }

    @Test
    void injectsHonestFallbackWhenGreptimeIsDisabled() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(InstrumentationSignalDetectionStore.class);
            assertThat(context.getBean(InstrumentationSignalDetectionStore.class))
                    .isInstanceOf(UnavailableInstrumentationSignalDetectionStore.class);
        });
    }

    @Test
    void injectsHonestFallbackWhenGreptimeExecutorIsAbsent() {
        contextRunner
                .withPropertyValues("warehouse.store.greptime.enabled=true")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(InstrumentationSignalDetectionStore.class);
                    assertThat(context.getBean(InstrumentationSignalDetectionStore.class))
                            .isInstanceOf(UnavailableInstrumentationSignalDetectionStore.class);
                });
    }

    @Configuration(proxyBeanMethods = false)
    @ComponentScan("org.apache.hertzbeat.observability.instrumentation")
    static class DetectionStoreConfiguration {
    }
}
