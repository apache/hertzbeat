/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.nativex;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Test;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.predicate.RuntimeHintsPredicates;

class CollectorRuntimeHintsRegistrarTest {

    private static final List<Class<?>> CONFIG_BINDING_TYPES = List.of(
            ManagedOtelRuntimeConfig.class,
            ManagedOtelRuntimeConfig.PrometheusTarget.class,
            ManagedOtelRuntimeConfig.FileLogSource.class,
            ManagedOtelRuntimeConfig.ResourceDetector.class,
            ManagedOtelRuntimeConfig.TelemetryFilterPreset.class,
            ManagedOtelRuntimeConfig.HostMetricsScraper.class);

    private static final List<Class<?>> STATUS_BINDING_TYPES = List.of(
            ManagedOtelRuntimeStatus.class,
            ManagedOtelRuntimeStatus.RuntimeState.class,
            ManagedOtelRuntimeStatus.IntakeCredentialState.class,
            ManagedOtelRuntimeStatus.FailureCode.class,
            ManagedOtelRuntimeStatus.ValueState.class,
            ManagedOtelRuntimeStatus.ObservedLong.class,
            ManagedOtelRuntimeStatus.SignalCounters.class,
            ManagedOtelRuntimeStatus.SignalGauges.class,
            ManagedOtelRuntimeStatus.FileConsumerStatus.class,
            ManagedOtelRuntimeStatus.RuntimeTelemetry.class,
            ManagedOtelRuntimeStatus.ManagedOtelSourceStatus.class,
            ManagedOtelRuntimeStatus.SourceType.class,
            ManagedOtelRuntimeStatus.SourceState.class);

    @Test
    void registersManagedRuntimeConfigAndStatusBindingClosure() {
        RuntimeHints hints = new RuntimeHints();
        new CollectorRuntimeHintsRegistrar().registerHints(hints, getClass().getClassLoader());

        CONFIG_BINDING_TYPES.forEach(type -> assertBindingType(hints, type));
        STATUS_BINDING_TYPES.forEach(type -> assertBindingType(hints, type));
    }

    private void assertBindingType(RuntimeHints hints, Class<?> type) {
        assertTrue(RuntimeHintsPredicates.reflection().onType(type)
                        .withMemberCategories(MemberCategory.ACCESS_DECLARED_FIELDS,
                                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS)
                        .test(hints),
                () -> "Missing managed runtime Native binding closure for " + type.getName());
    }
}
