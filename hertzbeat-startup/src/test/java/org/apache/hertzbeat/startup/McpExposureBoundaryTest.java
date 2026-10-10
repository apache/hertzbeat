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

package org.apache.hertzbeat.startup;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.AnnotatedBeanDefinitionReader;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.util.ClassUtils;

class McpExposureBoundaryTest {

    private static final String MCP_CONVERTER_AUTO_CONFIGURATION =
            "org.springframework.ai.mcp.server.common.autoconfigure.ToolCallbackConverterAutoConfiguration";

    @Test
    void disabledDefaultDoesNotAggregateLegacySkillOrPoisonProviders() throws IOException {
        PropertySource<?> properties = applicationProperties();
        String serverEnabled = String.valueOf(properties.getProperty("spring.ai.mcp.server.enabled"));
        String converterEnabled = String.valueOf(
                properties.getProperty("spring.ai.mcp.server.tool-callback-converter"));

        new ApplicationContextRunner()
                .withPropertyValues(
                        "spring.ai.mcp.server.enabled=" + serverEnabled,
                        "spring.ai.mcp.server.tool-callback-converter=" + converterEnabled)
                .withInitializer(context -> {
                    if (ClassUtils.isPresent(MCP_CONVERTER_AUTO_CONFIGURATION, getClass().getClassLoader())) {
                        Class<?> converter = ClassUtils.resolveClassName(
                                MCP_CONVERTER_AUTO_CONFIGURATION, getClass().getClassLoader());
                        new AnnotatedBeanDefinitionReader((BeanDefinitionRegistry) context.getBeanFactory())
                                .register(converter);
                    }
                })
                .withUserConfiguration(ProviderCatalog.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(ExposureProbe.class);
                    assertThat(context).getBeans(ToolCallbackProvider.class).hasSize(3);
                    assertThat(context).doesNotHaveBean("syncTools");
                    assertThat(context).doesNotHaveBean("asyncTools");
                    assertThat(context.getBean(ExposureProbe.class).discoveries()).isZero();
                });
    }

    @Test
    void startupClasspathDoesNotContainAnMcpServerTransport() {
        assertThat(ClassUtils.isPresent(
                "org.springframework.ai.mcp.server.common.autoconfigure.McpServerAutoConfiguration",
                getClass().getClassLoader())).isFalse();
        assertThat(ClassUtils.isPresent(
                "org.springframework.ai.mcp.server.webmvc.autoconfigure.McpServerStreamableHttpWebMvcAutoConfiguration",
                getClass().getClassLoader())).isFalse();
    }

    private PropertySource<?> applicationProperties() throws IOException {
        Path resource = repoRoot().resolve("hertzbeat-startup/src/main/resources/application.yml");
        return new YamlPropertySourceLoader().load("application", new FileSystemResource(resource)).getFirst();
    }

    private Path repoRoot() {
        Path userDir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        return Files.exists(userDir.resolve("hertzbeat-startup/pom.xml")) ? userDir : userDir.getParent();
    }

    static class ProviderCatalog {

        @Bean
        ExposureProbe exposureProbe() {
            return new ExposureProbe();
        }

        @Bean("hertzbeatTools")
        ToolCallbackProvider hertzbeatTools(ExposureProbe probe) {
            return probe.provider();
        }

        @Bean
        SkillRegistry skillRegistry(ExposureProbe probe) {
            return org.mockito.Mockito.mock(SkillRegistry.class, invocation -> {
                if ("getToolCallbacks".equals(invocation.getMethod().getName())) {
                    probe.recordDiscovery();
                    throw new AssertionError("SkillRegistry must not be aggregated into MCP");
                }
                return org.mockito.Answers.RETURNS_DEFAULTS.answer(invocation);
            });
        }

        @Bean
        ToolCallbackProvider poisonProvider(ExposureProbe probe) {
            return probe.provider();
        }
    }

    static final class ExposureProbe {

        private final AtomicInteger discoveries = new AtomicInteger();

        ToolCallbackProvider provider() {
            return () -> {
                recordDiscovery();
                throw new AssertionError("ToolCallbackProvider must not be aggregated into MCP");
            };
        }

        void recordDiscovery() {
            discoveries.incrementAndGet();
        }

        int discoveries() {
            return discoveries.get();
        }
    }
}
