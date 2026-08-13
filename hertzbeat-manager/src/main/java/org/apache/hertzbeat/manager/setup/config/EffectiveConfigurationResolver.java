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

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.springframework.boot.origin.Origin;
import org.springframework.boot.origin.OriginLookup;
import org.springframework.boot.origin.OriginTrackedResource;
import org.springframework.boot.origin.TextResourceOrigin;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Environment;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

/** Resolves the supported configuration layers using Spring's documented precedence. */
public final class EffectiveConfigurationResolver {

    private static final String CONFIGURATION_PROPERTIES = "configurationProperties";

    public EffectiveConfigurationValue<String> resolve(
            Environment environment, String key, RestartRequirement restartRequirement) {
        Objects.requireNonNull(environment, "environment");
        Objects.requireNonNull(key, "key");
        if (!(environment instanceof ConfigurableEnvironment configurable)) {
            throw new IllegalArgumentException("A configurable Spring environment is required");
        }
        String value = environment.getProperty(key);
        if (value == null) {
            throw new IllegalArgumentException("Configuration key is unavailable: " + key);
        }
        for (PropertySource<?> propertySource : configurable.getPropertySources()) {
            if (!CONFIGURATION_PROPERTIES.equals(propertySource.getName())
                    && propertySource.getProperty(key) != null) {
                return new EffectiveConfigurationValue<>(
                        value, classify(propertySource, key), restartRequirement);
            }
        }
        throw new IllegalStateException("Configuration source is unavailable for key: " + key);
    }

    private static ConfigSource classify(PropertySource<?> propertySource, String key) {
        String sourceName = propertySource.getName();
        if ("commandLineArgs".equals(sourceName)) {
            return ConfigSource.COMMAND_LINE;
        }
        if (StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME.equals(sourceName)) {
            return ConfigSource.SYSTEM_PROPERTY;
        }
        if (StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME.equals(sourceName)) {
            return ConfigSource.ENVIRONMENT;
        }
        if (ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE.equals(sourceName)
                || ManagedActiveConfigurationInspector.MANAGED_SECRET_SOURCE.equals(sourceName)) {
            return ConfigSource.UI_MANAGED;
        }
        Origin origin = OriginLookup.getOrigin(propertySource, key);
        if (origin instanceof TextResourceOrigin textOrigin) {
            return unwrap(textOrigin.getResource()) instanceof ClassPathResource
                    ? ConfigSource.BUILT_IN_DEFAULT : ConfigSource.EXTERNAL_FILE;
        }
        throw new IllegalStateException("Unsupported configuration property source: " + sourceName);
    }

    private static Resource unwrap(Resource resource) {
        Resource current = resource;
        while (current instanceof OriginTrackedResource tracked) {
            current = tracked.getResource();
        }
        return current;
    }
}
