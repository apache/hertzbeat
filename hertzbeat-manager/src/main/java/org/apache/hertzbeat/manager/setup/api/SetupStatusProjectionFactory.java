/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATABASE_KIND;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_ENABLED;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_EXPIRE_TIME;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_HOST;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_SSL_ENABLED;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_STARTTLS_ENABLED;
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
import org.apache.hertzbeat.manager.setup.config.ManagedOptionalConfiguration.ServerInstrumentationSettings;
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
        boolean mailConfigured = externallyConfigured(environment, MAIL_HOST, true);
        OptionalConfigurationSummary optional = new OptionalConfigurationSummary(
                externallyConfiguredEndpoint(environment, SERVER_OTLP_HTTP),
                externallyConfiguredEndpoint(environment, SERVER_OTLP_GRPC),
                externallyConfigured(environment, GREPTIME_EXPIRE_TIME, true), mailConfigured);
        MailSecurity mailSecurity = mailConfigured ? mailSecurity(environment) : null;
        return new SetupConfigurationProjection(
                new ManagementDatabaseSummary(kind, managedPresent || database.source() != ConfigSource.BUILT_IN_DEFAULT,
                        database.source(), false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME,
                        managedPresent || telemetrySource != ConfigSource.BUILT_IN_DEFAULT,
                        telemetrySource, false), optional, SetupWarningPolicy.INSTANCE.evaluate(
                        kind, environment.getProperty(SERVER_OTLP_HTTP),
                        environment.getProperty(SERVER_OTLP_GRPC), mailSecurity));
    }

    private boolean externallyConfigured(Environment environment, String key, boolean requireText) {
        if (!environment.containsProperty(key)) {
            return false;
        }
        var resolved = resolver.resolve(environment, key, RestartRequirement.LIVE_RELOAD);
        return resolved.source() != ConfigSource.BUILT_IN_DEFAULT
                && (!requireText || !resolved.value().isBlank());
    }

    private boolean externallyConfiguredEndpoint(Environment environment, String key) {
        if (!environment.containsProperty(key)) {
            return false;
        }
        var resolved = resolver.resolve(environment, key, RestartRequirement.LIVE_RELOAD);
        return resolved.source() != ConfigSource.BUILT_IN_DEFAULT
                && ServerInstrumentationSettings.normalize(resolved.value()).isPresent();
    }

    private static MailSecurity mailSecurity(Environment environment) {
        if (!environment.containsProperty(MAIL_SSL_ENABLED)
                || !environment.containsProperty(MAIL_STARTTLS_ENABLED)) {
            return null;
        }
        if (environment.getProperty(MAIL_SSL_ENABLED, Boolean.class, false)) {
            return MailSecurity.TLS;
        }
        return environment.getProperty(MAIL_STARTTLS_ENABLED, Boolean.class, false)
                ? MailSecurity.STARTTLS : MailSecurity.NONE;
    }
}
