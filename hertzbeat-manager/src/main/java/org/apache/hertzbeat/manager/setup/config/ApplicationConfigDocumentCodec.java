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

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;

final class ApplicationConfigDocumentCodec implements ManagedDocumentCodec<ManagedApplicationConfig> {

    // This exact flat-key allowlist is the boundary that prevents setup from becoming an arbitrary YAML editor.
    private static final String DATASOURCE_URL = "spring.datasource.url";
    private static final String DATASOURCE_USERNAME = "spring.datasource.username";
    private static final String DATABASE_KIND = "spring.jpa.database";
    private static final String DUCKDB_ENABLED = "warehouse.store.duckdb.enabled";
    private static final String GREPTIME_ENABLED = "warehouse.store.greptime.enabled";
    private static final String GREPTIME_GRPC = "warehouse.store.greptime.grpc-endpoints";
    private static final String GREPTIME_HTTP = "warehouse.store.greptime.http-endpoint";
    private static final String GREPTIME_DATABASE = "warehouse.store.greptime.database";
    private static final String GREPTIME_USERNAME = "warehouse.store.greptime.username";
    private static final Set<String> REQUIRED_KEYS = Set.of(
            DATASOURCE_URL, DATASOURCE_USERNAME, DATABASE_KIND,
            DUCKDB_ENABLED, GREPTIME_ENABLED,
            GREPTIME_GRPC, GREPTIME_HTTP, GREPTIME_DATABASE);

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
                || values.size() > REQUIRED_KEYS.size() + 1
                || (values.size() > REQUIRED_KEYS.size() && !values.containsKey(GREPTIME_USERNAME))
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
            decoded = new ManagedApplicationConfig(metadata, values.containsKey(GREPTIME_USERNAME)
                    ? GreptimeSettings.authenticated(
                            endpoints, text(values, GREPTIME_DATABASE), text(values, GREPTIME_USERNAME))
                    : GreptimeSettings.anonymous(endpoints, text(values, GREPTIME_DATABASE)));
        } catch (IllegalArgumentException exception) {
            throw DocumentException.invalid();
        }
        return new Decoded<>(decoded, body.generation());
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
