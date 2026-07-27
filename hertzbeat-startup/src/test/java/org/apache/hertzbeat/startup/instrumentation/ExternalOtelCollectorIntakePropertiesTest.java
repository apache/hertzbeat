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

package org.apache.hertzbeat.startup.instrumentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ExternalOtelCollectorIntakePropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(BindingConfig.class);

    @Test
    void bindsOnlyTheExplicitNonSecretProfileFields() {
        contextRunner.withPropertyValues(
                        "hertzbeat.instrumentation.external-otel-collector.profile-id=external-west",
                        "hertzbeat.instrumentation.external-otel-collector.otlp-http-endpoint="
                                + "http://otel.example.test:4318",
                        "hertzbeat.instrumentation.external-otel-collector.otlp-grpc-endpoint="
                                + "https://otel.example.test:4317")
                .run(context -> {
                    ExternalOtelCollectorIntakeProperties properties =
                            context.getBean(ExternalOtelCollectorIntakeProperties.class);
                    assertEquals("external-west", properties.profileId());
                    assertEquals("http://otel.example.test:4318", properties.otlpHttpEndpoint());
                    assertEquals("https://otel.example.test:4317", properties.otlpGrpcEndpoint());
                });

        assertThat(Arrays.stream(ExternalOtelCollectorIntakeProperties.class.getRecordComponents())
                        .map(component -> component.getName()))
                .containsExactly("profileId", "otlpHttpEndpoint", "otlpGrpcEndpoint");
    }

    @Test
    void remainsUnconfiguredWhenDeploymentPropertiesAreAbsent() {
        contextRunner.run(context -> {
            ExternalOtelCollectorIntakeProperties properties =
                    context.getBean(ExternalOtelCollectorIntakeProperties.class);
            assertThat(properties.configured()).isFalse();
        });
    }

    @EnableConfigurationProperties(ExternalOtelCollectorIntakeProperties.class)
    static class BindingConfig {
    }
}
