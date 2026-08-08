/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATABASE_KIND;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_ENABLED;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_HOST;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_SECURITY;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.PUBLIC_BASE_URL;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.RETENTION_LOGS;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.RETENTION_METRICS;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.RETENTION_TRACES;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.SERVER_OTLP_GRPC;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.SERVER_OTLP_HTTP;

import java.util.Locale;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ManagementDatabaseSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreSummary;
import org.apache.hertzbeat.manager.setup.config.EffectiveConfigurationResolver;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector.Inspection;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector.State;
import org.apache.hertzbeat.manager.setup.config.RestartRequirement;
import org.apache.hertzbeat.manager.setup.workflow.SetupConfigurationProjection;
import org.apache.hertzbeat.manager.setup.workflow.SetupWarningPolicy;
import org.springframework.core.env.Environment;

/** Builds the secret-free status view from verified managed data and effective Spring precedence. */
final class SetupStatusProjectionFactory {
    private final EffectiveConfigurationResolver resolver = new EffectiveConfigurationResolver();

    SetupConfigurationProjection create(Environment environment, Inspection inspection) {
        if (!environment.containsProperty(DATABASE_KIND)) {
            return SetupConfigurationProjection.defaults();
        }
        var database = resolver.resolve(environment, DATABASE_KIND, RestartRequirement.RESTART_REQUIRED);
        ConfigSource telemetrySource = environment.containsProperty(GREPTIME_ENABLED)
                ? resolver.resolve(environment, GREPTIME_ENABLED, RestartRequirement.RESTART_REQUIRED).source()
                : database.source();
        boolean managedPresent = inspection.state() == State.LOADABLE;
        MetadataDatabaseKind kind = MetadataDatabaseKind.valueOf(database.value().toUpperCase(Locale.ROOT));
        OptionalConfigurationSummary optional = new OptionalConfigurationSummary(
                hasText(environment, PUBLIC_BASE_URL), hasText(environment, SERVER_OTLP_HTTP),
                hasText(environment, SERVER_OTLP_GRPC), hasRetention(environment),
                hasText(environment, MAIL_HOST));
        String mailSecurityValue = environment.getProperty(MAIL_SECURITY);
        MailSecurity mailSecurity = mailSecurityValue != null
                && MailSecurity.NONE.name().equalsIgnoreCase(mailSecurityValue) ? MailSecurity.NONE : null;
        return new SetupConfigurationProjection(
                new ManagementDatabaseSummary(kind, managedPresent || database.source() != ConfigSource.BUILT_IN_DEFAULT,
                        database.source(), false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME,
                        managedPresent || telemetrySource != ConfigSource.BUILT_IN_DEFAULT,
                        telemetrySource, false), optional, SetupWarningPolicy.INSTANCE.evaluate(
                        kind, environment.getProperty(PUBLIC_BASE_URL), mailSecurity));
    }

    private static boolean hasText(Environment environment, String key) {
        String value = environment.getProperty(key);
        return value != null && !value.isBlank();
    }

    private static boolean hasRetention(Environment environment) {
        return environment.containsProperty(RETENTION_METRICS)
                || environment.containsProperty(RETENTION_LOGS)
                || environment.containsProperty(RETENTION_TRACES);
    }
}
