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
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.PUBLIC_BASE_URL;
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
import org.apache.hertzbeat.manager.setup.config.SetupPublicAddress;
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
                externallyConfiguredAddress(environment, PUBLIC_BASE_URL, SetupPublicAddress.Kind.PUBLIC_BASE_URL),
                externallyConfiguredAddress(
                        environment, SERVER_OTLP_HTTP, SetupPublicAddress.Kind.SERVER_OTLP_ENDPOINT),
                externallyConfiguredAddress(
                        environment, SERVER_OTLP_GRPC, SetupPublicAddress.Kind.SERVER_OTLP_ENDPOINT),
                externallyConfigured(environment, GREPTIME_EXPIRE_TIME, true), mailConfigured);
        MailSecurity mailSecurity = mailConfigured ? mailSecurity(environment) : null;
        return new SetupConfigurationProjection(
                new ManagementDatabaseSummary(kind, managedPresent || database.source() != ConfigSource.BUILT_IN_DEFAULT,
                        database.source(), false),
                new TelemetryStoreSummary(TelemetryStoreKind.GREPTIME,
                        managedPresent || telemetrySource != ConfigSource.BUILT_IN_DEFAULT,
                        telemetrySource, false), optional, SetupWarningPolicy.INSTANCE.evaluate(
                        kind, environment.getProperty(PUBLIC_BASE_URL), environment.getProperty(SERVER_OTLP_HTTP),
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

    private boolean externallyConfiguredAddress(Environment environment, String key, SetupPublicAddress.Kind kind) {
        if (!environment.containsProperty(key)) {
            return false;
        }
        var resolved = resolver.resolve(environment, key, RestartRequirement.LIVE_RELOAD);
        boolean valid = kind == SetupPublicAddress.Kind.PUBLIC_BASE_URL
                ? SetupPublicAddress.tryPublicBaseUrl(resolved.value()).isPresent()
                : SetupPublicAddress.tryServerOtlpEndpoint(resolved.value()).isPresent();
        return resolved.source() != ConfigSource.BUILT_IN_DEFAULT && valid;
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
