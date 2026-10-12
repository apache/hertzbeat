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

package org.apache.hertzbeat.startup.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.Configuration;

class StartupArgumentPropertiesTest {
    @TempDir
    private Path installationRoot;

    @ParameterizedTest(name = "{0}")
    @MethodSource("commandLineForms")
    void preSpringResolutionMatchesLaunchedEnvironment(String ignored, String[] commandLine) {
        String resolved = StartupArgumentProperties.resolve(commandLine,
                StartupModePropertyProbe.PROPERTY_NAME, "system-value", "environment-value");
        String[] launchArguments = Arrays.copyOf(commandLine, commandLine.length + 1);
        launchArguments[commandLine.length] = "--" + SetupInstallationPaths.ROOT_PROPERTY
                + "=" + installationRoot;

        try (var context = new SpringApplicationBuilder(ArgumentApplication.class)
                .web(WebApplicationType.NONE)
                .logStartupInfo(false)
                .properties("spring.main.banner-mode=off")
                .run(launchArguments)) {
            assertEquals(context.getEnvironment().getProperty(StartupModePropertyProbe.PROPERTY_NAME), resolved);
        }
    }

    private static Stream<Arguments> commandLineForms() {
        String option = "--" + StartupModePropertyProbe.PROPERTY_NAME;
        return Stream.of(
                Arguments.of("bare option", (Object) new String[] {option}),
                Arguments.of("value option", (Object) new String[] {option + "=setup_only"}),
                Arguments.of("duplicate option", (Object) new String[] {
                        option + "=setup_only", option + "=normal"
                }));
    }

    @Configuration(proxyBeanMethods = false)
    static class ArgumentApplication {
    }
}
