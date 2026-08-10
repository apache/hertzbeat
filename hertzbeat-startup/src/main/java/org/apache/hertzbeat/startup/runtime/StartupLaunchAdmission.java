/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.io.IOException;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;

/** Unforgeable in-process admission attached only by the official Spring context launcher. */
public final class StartupLaunchAdmission {

    public static final String INTERNAL_PROPERTY_SOURCE = "hertzbeatInternalRuntimeMode";
    private static final String TOKEN_PROPERTY = "hertzbeat.internal.startup-admission";
    private static final String EXACT_DATASOURCE_PROPERTY =
            "hertzbeat.internal.exact-managed-datasource-required";
    private static final Object TOKEN = new Object();

    private StartupLaunchAdmission() {
    }

    static MapPropertySource internalPropertySource(
            StartupDecision decision, Path installationRoot, Mode mode) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put(RuntimeMode.PROPERTY_NAME, decision.mode().value());
        properties.put(SetupInstallationPaths.ROOT_PROPERTY,
                installationRoot.toAbsolutePath().normalize().toString());
        properties.put(TOKEN_PROPERTY, TOKEN);
        properties.put(EXACT_DATASOURCE_PROPERTY, mode == Mode.EXACT_MANAGED_DATASOURCE);
        return new MapPropertySource(INTERNAL_PROPERTY_SOURCE, Map.copyOf(properties));
    }

    static MapPropertySource runtimeModePropertySource(StartupDecision decision) {
        return new MapPropertySource(INTERNAL_PROPERTY_SOURCE,
                Map.of(RuntimeMode.PROPERTY_NAME, decision.mode().value()));
    }

    public static boolean isTrusted(PropertySource<?> source) {
        return source != null && source.getProperty(TOKEN_PROPERTY) == TOKEN;
    }

    public static boolean exactManagedDatasourceRequired(PropertySource<?> source) {
        return isTrusted(source) && Boolean.TRUE.equals(source.getProperty(EXACT_DATASOURCE_PROPERTY));
    }

    public static boolean isBoundTo(PropertySource<?> source, Path canonicalRoot) {
        if (!isTrusted(source)) {
            return false;
        }
        Object configuredRoot = source.getProperty(SetupInstallationPaths.ROOT_PROPERTY);
        if (!(configuredRoot instanceof String root)) {
            return false;
        }
        try {
            return Path.of(root).toAbsolutePath().normalize().toRealPath().equals(canonicalRoot);
        } catch (IOException | RuntimeException failure) {
            return false;
        }
    }

    public static MapPropertySource sanitizedPropertySource(RuntimeMode mode, Path canonicalRoot) {
        return new MapPropertySource(INTERNAL_PROPERTY_SOURCE, Map.of(
                RuntimeMode.PROPERTY_NAME, mode.value(),
                SetupInstallationPaths.ROOT_PROPERTY, canonicalRoot.toString()));
    }

    enum Mode { ORDINARY, EXACT_MANAGED_DATASOURCE }
}
