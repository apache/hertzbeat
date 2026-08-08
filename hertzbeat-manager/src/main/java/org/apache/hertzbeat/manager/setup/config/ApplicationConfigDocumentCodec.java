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

import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATABASE_KIND;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATASOURCE_URL;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.DATASOURCE_USERNAME;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_DATABASE;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_ENABLED;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_GRPC;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_HTTP;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.GREPTIME_USERNAME;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_HOST;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.MAIL_SECURITY;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.PUBLIC_BASE_URL;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.RETENTION_LOGS;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.RETENTION_METRICS;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.RETENTION_TRACES;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.SERVER_OTLP_GRPC;
import static org.apache.hertzbeat.manager.setup.config.ManagedConfigurationKeys.SERVER_OTLP_HTTP;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;

final class ApplicationConfigDocumentCodec implements ManagedDocumentCodec<ManagedApplicationConfig> {

    // This exact flat-key allowlist is the boundary that prevents setup from becoming an arbitrary YAML editor.
    private static final String DUCKDB_ENABLED = "warehouse.store.duckdb.enabled";
    private static final String MAIL_PORT = "spring.mail.port";
    private static final String MAIL_USERNAME = "spring.mail.username";
    private static final String MAIL_FROM = "hertzbeat.setup.mail.from-address";
    private static final Set<String> REQUIRED_KEYS = Set.of(
            DATASOURCE_URL, DATASOURCE_USERNAME, DATABASE_KIND,
            DUCKDB_ENABLED, GREPTIME_ENABLED,
            GREPTIME_GRPC, GREPTIME_HTTP, GREPTIME_DATABASE);
    private static final Set<String> ALLOWED_KEYS = Set.of(
            DATASOURCE_URL, DATASOURCE_USERNAME, DATABASE_KIND,
            DUCKDB_ENABLED, GREPTIME_ENABLED, GREPTIME_GRPC, GREPTIME_HTTP,
            GREPTIME_DATABASE, GREPTIME_USERNAME, PUBLIC_BASE_URL, SERVER_OTLP_HTTP,
            SERVER_OTLP_GRPC, RETENTION_METRICS, RETENTION_LOGS, RETENTION_TRACES,
            MAIL_HOST, MAIL_PORT, MAIL_SECURITY, MAIL_USERNAME, MAIL_FROM);

    @Override
    public byte[] encode(ManagedApplicationConfig value, String generation) {
        Map<String, String> values = plainProperties(value);
        StringBuilder body = new StringBuilder();
        values.forEach((key, item) -> body.append(key).append(": '")
                .append(item.replace("'", "''")).append("'\n"));
        return Integrity.envelope(body.toString(), generation);
    }

    static Map<String, Object> springProperties(ManagedApplicationConfig value) {
        Map<String, Object> properties = new LinkedHashMap<>();
        plainProperties(value).forEach(
                (key, item) -> properties.put(key, Integrity.literalForSpring(item)));
        return Map.copyOf(properties);
    }

    private static Map<String, String> plainProperties(ManagedApplicationConfig value) {
        Map<String, String> values = new LinkedHashMap<>();
        values.put(DATASOURCE_URL, value.metadataDatabase().jdbcUrl());
        values.put(DATASOURCE_USERNAME, value.metadataDatabase().username());
        values.put(DATABASE_KIND, value.metadataDatabase().kind().name());
        values.put(DUCKDB_ENABLED, "false");
        values.put(GREPTIME_ENABLED, "true");
        values.put(GREPTIME_GRPC, value.telemetryStore().endpoints().grpc());
        values.put(GREPTIME_HTTP, value.telemetryStore().endpoints().http());
        values.put(GREPTIME_DATABASE, value.telemetryStore().database());
        value.telemetryStore().username().ifPresent(username -> values.put(GREPTIME_USERNAME, username));
        value.optional().publicAccess().ifPresent(publicAccess -> {
            publicAccess.publicBaseUrl().ifPresent(item -> values.put(PUBLIC_BASE_URL, item));
            publicAccess.serverOtlpHttpEndpoint().ifPresent(item -> values.put(SERVER_OTLP_HTTP, item));
            publicAccess.serverOtlpGrpcEndpoint().ifPresent(item -> values.put(SERVER_OTLP_GRPC, item));
        });
        value.optional().retention().ifPresent(retention -> {
            putInteger(values, RETENTION_METRICS, retention.metricsDays());
            putInteger(values, RETENTION_LOGS, retention.logsDays());
            putInteger(values, RETENTION_TRACES, retention.tracesDays());
        });
        value.optional().mail().ifPresent(mail -> {
            values.put(MAIL_HOST, mail.host());
            values.put(MAIL_PORT, Integer.toString(mail.port()));
            values.put(MAIL_SECURITY, mail.security().name());
            mail.username().ifPresent(item -> values.put(MAIL_USERNAME, item));
            values.put(MAIL_FROM, mail.fromAddress());
        });
        return values;
    }

    @Override
    public Decoded<ManagedApplicationConfig> decode(byte[] content)
            throws DocumentException {
        Integrity.VerifiedBody body = Integrity.extract(content);
        Integrity.verify(body);
        Map<?, ?> values;
        try {
            Object loaded = new Yaml(new SafeConstructor(new LoaderOptions())).load(body.content());
            if (!(loaded instanceof Map<?, ?> loadedMap)) {
                throw DocumentException.corrupt();
            }
            values = loadedMap;
        } catch (YAMLException exception) {
            throw DocumentException.corrupt();
        }
        if (!values.keySet().stream().allMatch(String.class::isInstance)
                || !values.keySet().containsAll(REQUIRED_KEYS)
                || !ALLOWED_KEYS.containsAll(values.keySet())
                || !completeMailGroup(values)
                || !usesSupportedTelemetryStorage(values)) {
            throw DocumentException.corrupt();
        }
        ManagedApplicationConfig decoded;
        try {
            MetadataDatabaseSettings metadata = new MetadataDatabaseSettings(
                    MetadataDatabaseKind.valueOf(text(values, DATABASE_KIND)),
                    text(values, DATASOURCE_URL), text(values, DATASOURCE_USERNAME));
            GreptimeEndpoints endpoints = new GreptimeEndpoints(
                    text(values, GREPTIME_GRPC), text(values, GREPTIME_HTTP));
            GreptimeSettings telemetry = values.containsKey(GREPTIME_USERNAME)
                    ? GreptimeSettings.authenticated(
                            endpoints, text(values, GREPTIME_DATABASE), text(values, GREPTIME_USERNAME))
                    : GreptimeSettings.anonymous(endpoints, text(values, GREPTIME_DATABASE));
            decoded = new ManagedApplicationConfig(metadata, telemetry, optional(values));
        } catch (IllegalArgumentException exception) {
            throw DocumentException.invalid();
        }
        return new Decoded<>(decoded, body.generation());
    }

    private static ManagedOptionalConfiguration optional(Map<?, ?> values) {
        boolean publicPresent = containsAny(values, PUBLIC_BASE_URL, SERVER_OTLP_HTTP, SERVER_OTLP_GRPC);
        Optional<ManagedOptionalConfiguration.PublicAccessSettings> publicAccess = publicPresent
                ? Optional.of(new ManagedOptionalConfiguration.PublicAccessSettings(
                optionalText(values, PUBLIC_BASE_URL), optionalText(values, SERVER_OTLP_HTTP),
                optionalText(values, SERVER_OTLP_GRPC))) : Optional.empty();
        boolean retentionPresent = containsAny(values, RETENTION_METRICS, RETENTION_LOGS, RETENTION_TRACES);
        Optional<ManagedOptionalConfiguration.RetentionSettings> retention = retentionPresent
                ? Optional.of(new ManagedOptionalConfiguration.RetentionSettings(
                optionalInteger(values, RETENTION_METRICS), optionalInteger(values, RETENTION_LOGS),
                optionalInteger(values, RETENTION_TRACES))) : Optional.empty();
        Optional<ManagedOptionalConfiguration.MailSettings> mail = values.containsKey(MAIL_HOST)
                ? Optional.of(new ManagedOptionalConfiguration.MailSettings(
                text(values, MAIL_HOST), Integer.parseInt(text(values, MAIL_PORT)),
                MailSecurity.valueOf(text(values, MAIL_SECURITY)), optionalText(values, MAIL_USERNAME),
                text(values, MAIL_FROM))) : Optional.empty();
        return new ManagedOptionalConfiguration(publicAccess, retention, mail);
    }

    private static boolean completeMailGroup(Map<?, ?> values) {
        boolean any = containsAny(values, MAIL_HOST, MAIL_PORT, MAIL_SECURITY, MAIL_USERNAME, MAIL_FROM);
        return !any || values.keySet().containsAll(Set.of(MAIL_HOST, MAIL_PORT, MAIL_SECURITY, MAIL_FROM));
    }

    private static boolean containsAny(Map<?, ?> values, String... keys) {
        for (String key : keys) {
            if (values.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private static Optional<String> optionalText(Map<?, ?> values, String key) {
        return values.containsKey(key) ? Optional.of(text(values, key)) : Optional.empty();
    }

    private static Integer optionalInteger(Map<?, ?> values, String key) {
        return values.containsKey(key) ? Integer.valueOf(text(values, key)) : null;
    }

    private static void putInteger(Map<String, String> values, String key, Integer value) {
        if (value != null) {
            values.put(key, value.toString());
        }
    }

    /**
     * Managed setup configuration has one supported telemetry-storage policy. Checking the values as
     * well as the keys prevents a hand-edited document from silently enabling an unsupported store.
     */
    private static boolean usesSupportedTelemetryStorage(Map<?, ?> values) {
        return "false".equals(values.get(DUCKDB_ENABLED))
                && "true".equals(values.get(GREPTIME_ENABLED));
    }

    private static String text(Map<?, ?> values, String key) {
        Object value = values.get(key);
        if (!(value instanceof String text)) {
            throw new IllegalArgumentException("Missing managed value");
        }
        return text;
    }
}
