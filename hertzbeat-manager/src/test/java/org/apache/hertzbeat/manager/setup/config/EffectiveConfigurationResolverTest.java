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

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class EffectiveConfigurationResolverTest {

    private static final String KEY = "sample.key";
    private final EffectiveConfigurationResolver resolver = new EffectiveConfigurationResolver();

    @Test
    void resolvesValueSourceAndRestartMetadataFromSpringEnvironment() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, Map.of(KEY, "selected")));

        EffectiveConfigurationValue<String> result =
                resolver.resolve(environment, KEY, RestartRequirement.RESTART_REQUIRED);

        assertEquals("selected", result.value());
        assertEquals(ConfigSource.SYSTEM_PROPERTY, result.source());
        assertEquals(RestartRequirement.RESTART_REQUIRED, result.restartRequirement());
    }

    @Test
    void rejectsUnknownPropertySourcesInsteadOfMisclassifyingThem() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("unsupported", Map.of(KEY, "value")));

        assertThrows(IllegalStateException.class,
                () -> resolver.resolve(environment, KEY, RestartRequirement.LIVE_RELOAD));
    }
}
