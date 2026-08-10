/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.config;

import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.startup.runtime.StartupLaunchAdmission;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;

/** Detects datasource identity overrides that take precedence over classpath configuration. */
final class ManagedMigrationDatasourceOverrideDetector {

    private static final Set<String> IDENTITY_KEYS = Set.of(
            "spring.datasource.url",
            "spring.datasource.username",
            "spring.datasource.password",
            "spring.datasource.driver-class-name",
            "spring.datasource.jndi-name",
            "spring.datasource.type");
    private static final Set<String> NORMALIZED_IDENTITY_KEYS = Set.of(
            "springdatasourceurl",
            "springdatasourceusername",
            "springdatasourcepassword",
            "springdatasourcedriverclassname",
            "springdatasourcejndiname",
            "springdatasourcetype");
    private static final String HIKARI_PREFIX = "springdatasourcehikari";

    boolean hasOverride(MutablePropertySources sources) {
        for (PropertySource<?> source : sources) {
            if (ManagedConfigEnvironmentPostProcessor.isClasspathConfigData(source)) {
                return false;
            }
            if (StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE.equals(source.getName())) {
                continue;
            }
            if (knownRestrictedSource(source)) {
                continue;
            }
            if (hasFiniteIdentityValue(source)) {
                return true;
            }
            if (source instanceof EnumerablePropertySource<?> enumerable) {
                if (hasIdentityKey(enumerable.getPropertyNames())) {
                    return true;
                }
            } else {
                return true;
            }
        }
        return false;
    }

    private boolean hasFiniteIdentityValue(PropertySource<?> source) {
        try {
            for (String key : IDENTITY_KEYS) {
                if (source.getProperty(key) != null) {
                    return true;
                }
            }
            return false;
        } catch (RuntimeException failure) {
            return true;
        }
    }

    private boolean hasIdentityKey(String[] propertyNames) {
        for (String propertyName : propertyNames) {
            String normalized = propertyName.toLowerCase(Locale.ROOT).replaceAll("[._-]", "");
            if (NORMALIZED_IDENTITY_KEYS.contains(normalized)
                    || normalized.startsWith(HIKARI_PREFIX)) {
                return true;
            }
        }
        return false;
    }

    private boolean knownRestrictedSource(PropertySource<?> source) {
        String type = source.getClass().getName();
        return type.equals("org.springframework.boot.context.properties.source."
                + "ConfigurationPropertySourcesPropertySource")
                || type.equals("org.springframework.boot.env.RandomValuePropertySource");
    }
}
