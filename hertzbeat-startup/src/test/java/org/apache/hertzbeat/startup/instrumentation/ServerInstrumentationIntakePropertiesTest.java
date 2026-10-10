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

class ServerInstrumentationIntakePropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(BindingConfig.class);

    @Test
    void bindsOnlyExplicitGlobalNonSecretServerProfileFields() {
        contextRunner.withPropertyValues(
                        "hertzbeat.instrumentation.server.profile-id=server-direct",
                        "hertzbeat.instrumentation.server.otlp-http-endpoint=http://server.example.test:1157/api/otlp",
                        "hertzbeat.instrumentation.server.otlp-grpc-endpoint=http://server.example.test:4317",
                        "hertzbeat.instrumentation.server.authentication=bearer_token")
                .run(context -> {
                    ServerInstrumentationIntakeProperties properties =
                            context.getBean(ServerInstrumentationIntakeProperties.class);
                    assertEquals("server-direct", properties.profileId());
                    assertEquals("http://server.example.test:1157/api/otlp", properties.otlpHttpEndpoint());
                    assertEquals("http://server.example.test:4317", properties.otlpGrpcEndpoint());
                    assertEquals("bearer_token", properties.authentication());
                });

        assertThat(Arrays.stream(ServerInstrumentationIntakeProperties.class.getRecordComponents())
                        .map(component -> component.getName()))
                .containsExactly("profileId", "otlpHttpEndpoint", "otlpGrpcEndpoint", "authentication");
    }

    @Test
    void remainsUnconfiguredWithoutAnExplicitPublicEndpoint() {
        contextRunner.run(context -> assertThat(context.getBean(ServerInstrumentationIntakeProperties.class)
                .configured()).isFalse());
    }

    @EnableConfigurationProperties(ServerInstrumentationIntakeProperties.class)
    static class BindingConfig {
    }
}
