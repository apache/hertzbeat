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

package org.apache.hertzbeat.startup.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.bootstrap.SetupOnlyApplication;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector.Inspection;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector.State;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupAdmission;
import org.apache.hertzbeat.startup.HertzBeatApplication;
import org.apache.hertzbeat.startup.runtime.StartupLaunchAdmission;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.origin.Origin;
import org.springframework.boot.origin.OriginLookup;
import org.springframework.boot.origin.OriginTrackedResource;
import org.springframework.boot.origin.TextResourceOrigin;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

/** Loads the two fixed managed files between operator files and classpath defaults for every profile. */
public final class ManagedConfigEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String INSTALLATION_ROOT_PROPERTY = SetupInstallationPaths.ROOT_PROPERTY;
    public static final String INTERNAL_RUNTIME_PROPERTY_SOURCE = StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE;
    private static final String DEFAULT_INSTALLATION_ROOT = ".";

    @Override
    public int getOrder() {
        return ConfigDataEnvironmentPostProcessor.ORDER + 1;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        PropertySource<?> internalMode = environment.getPropertySources().get(INTERNAL_RUNTIME_PROPERTY_SOURCE);
        RuntimeMode mode = internalMode == null ? RuntimeMode.NORMAL
                : RuntimeMode.fromProperty((String) internalMode.getProperty(RuntimeMode.PROPERTY_NAME));
        if (mode == RuntimeMode.SETUP_ONLY || mode == RuntimeMode.RECOVERY) {
            if (!setupOnlyApplication(application)) {
                throw migrationAdmissionFailed();
            }
            Path installationRoot = StartupLaunchAdmission.isTrusted(internalMode)
                    ? resolveInstallationRoot(environment) : null;
            promoteInternalMode(environment, internalMode);
            if (StartupLaunchAdmission.isTrusted(internalMode)) {
                requireTrustedInstallationRoot(internalMode, installationRoot);
                sanitizeStartupAdmission(environment, mode, installationRoot);
            }
            return;
        }
        if (internalMode == null && setupOnlyApplication(application)) {
            return;
        }
        Path installationRoot = resolveInstallationRoot(environment);
        promoteInternalMode(environment, internalMode);
        if (StartupLaunchAdmission.isTrusted(internalMode)) {
            requireTrustedInstallationRoot(internalMode, installationRoot);
        }
        Path directory = installationRoot.resolve("data/config");
        if (Files.isSymbolicLink(installationRoot)
                || Files.isSymbolicLink(directory.getParent()) || Files.isSymbolicLink(directory)) {
            throw recoveryRequired();
        }
        Inspection inspection = new ManagedActiveConfigurationInspector(installationRoot).inspect();
        if (fullApplication(application)) {
            requireStartupAdmission(environment, internalMode, installationRoot, inspection);
            sanitizeStartupAdmission(environment, mode, installationRoot);
        }
        if (inspection.state() == State.ABSENT) {
            return;
        }
        if (inspection.state() != State.LOADABLE) {
            throw recoveryRequired();
        }
        addBetweenExternalAndClasspath(environment.getPropertySources(), new MapPropertySource(
                ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE,
                inspection.applicationProperties()));
        addBetweenExternalAndClasspath(environment.getPropertySources(), new MapPropertySource(
                ManagedActiveConfigurationInspector.MANAGED_SECRET_SOURCE,
                inspection.secretProperties()));
    }

    private static boolean fullApplication(SpringApplication application) {
        return hasExactSource(application, HertzBeatApplication.class);
    }

    private static boolean setupOnlyApplication(SpringApplication application) {
        return hasExactSource(application, SetupOnlyApplication.class);
    }

    private static boolean hasExactSource(SpringApplication application, Class<?> source) {
        return application.getAllSources().contains(source)
                || application.getAllSources().contains(source.getName());
    }

    private static void requireStartupAdmission(
            ConfigurableEnvironment environment,
            PropertySource<?> internalMode,
            Path installationRoot,
            Inspection inspection) {
        if (!StartupLaunchAdmission.isTrusted(internalMode)
                || ManagedMigrationStartupAdmission.inspect(installationRoot)
                != ManagedMigrationStartupAdmission.CLEAR
                || StartupLaunchAdmission.exactManagedDatasourceRequired(internalMode)
                && inspection.state() != State.LOADABLE
                || StartupLaunchAdmission.exactManagedDatasourceRequired(internalMode)
                && new ManagedMigrationDatasourceOverrideDetector()
                .hasOverride(environment.getPropertySources())) {
            throw migrationAdmissionFailed();
        }
    }

    private static void sanitizeStartupAdmission(
            ConfigurableEnvironment environment, RuntimeMode mode, Path installationRoot) {
        try {
            environment.getPropertySources().replace(
                    INTERNAL_RUNTIME_PROPERTY_SOURCE,
                    StartupLaunchAdmission.sanitizedPropertySource(mode, installationRoot.toRealPath()));
        } catch (IOException | RuntimeException failure) {
            throw migrationAdmissionFailed();
        }
    }

    private static Path resolveInstallationRoot(ConfigurableEnvironment environment) {
        try {
            return Path.of(environment.getProperty(
                    INSTALLATION_ROOT_PROPERTY, DEFAULT_INSTALLATION_ROOT)).toAbsolutePath().normalize();
        } catch (RuntimeException failure) {
            throw migrationAdmissionFailed();
        }
    }

    private static void promoteInternalMode(
            ConfigurableEnvironment environment, PropertySource<?> internalMode) {
        if (internalMode != null) {
            environment.getPropertySources().remove(INTERNAL_RUNTIME_PROPERTY_SOURCE);
            environment.getPropertySources().addFirst(internalMode);
        }
    }

    private static void requireTrustedInstallationRoot(
            PropertySource<?> internalMode, Path installationRoot) {
        try {
            Path canonicalRoot = installationRoot.toRealPath();
            if (!StartupLaunchAdmission.isBoundTo(internalMode, canonicalRoot)) {
                throw migrationAdmissionFailed();
            }
        } catch (IOException | RuntimeException failure) {
            throw migrationAdmissionFailed();
        }
    }

    private static void addBetweenExternalAndClasspath(
            MutablePropertySources propertySources, PropertySource<?> managed) {
        for (PropertySource<?> source : propertySources) {
            if (isClasspathConfigData(source)) {
                propertySources.addBefore(source.getName(), managed);
                return;
            }
        }
        propertySources.addLast(managed);
    }

    static boolean isClasspathConfigData(PropertySource<?> source) {
        if (!(source instanceof EnumerablePropertySource<?> enumerable)) {
            return false;
        }
        for (String propertyName : enumerable.getPropertyNames()) {
            Origin origin = OriginLookup.getOrigin(source, propertyName);
            if (origin instanceof TextResourceOrigin textOrigin
                    && unwrap(textOrigin.getResource()) instanceof ClassPathResource) {
                return true;
            }
        }
        return false;
    }

    private static Resource unwrap(Resource resource) {
        Resource current = resource;
        while (current instanceof OriginTrackedResource tracked) {
            current = tracked.getResource();
        }
        return current;
    }

    private static IllegalStateException recoveryRequired() {
        return new IllegalStateException("Managed configuration requires recovery");
    }

    private static IllegalStateException migrationAdmissionFailed() {
        return new IllegalStateException("Managed migration startup admission failed");
    }
}
