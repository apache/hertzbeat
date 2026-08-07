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

import java.io.IOException;
import java.io.StringReader;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

final class SecretConfigDocumentCodec implements ManagedDocumentCodec<ManagedSecrets> {

    private static final String METADATA_PASSWORD = "spring.datasource.password";
    private static final String TELEMETRY_PASSWORD = "warehouse.store.greptime.password";

    @Override
    public byte[] encode(ManagedSecrets value, String generation) {
        StringBuilder body = new StringBuilder();
        append(body, METADATA_PASSWORD, value.metadataDatabasePassword());
        value.telemetryPassword().ifPresent(secret -> append(body, TELEMETRY_PASSWORD, secret));
        return Integrity.envelope(body.toString(), generation);
    }

    static Map<String, Object> springProperties(ManagedSecrets value) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put(METADATA_PASSWORD, springLiteral(value.metadataDatabasePassword()));
        value.telemetryPassword().ifPresent(
                secret -> properties.put(TELEMETRY_PASSWORD, springLiteral(secret)));
        return Map.copyOf(properties);
    }

    @Override
    public Decoded<ManagedSecrets> decode(byte[] content)
            throws DocumentException {
        Integrity.VerifiedBody body = Integrity.extract(content);
        Integrity.verify(body);
        Properties properties = new Properties();
        try {
            properties.load(new StringReader(body.content()));
        } catch (IOException | IllegalArgumentException exception) {
            throw DocumentException.corrupt();
        }
        if (!properties.stringPropertyNames().contains(METADATA_PASSWORD)
                || !Set.of(METADATA_PASSWORD, TELEMETRY_PASSWORD).containsAll(properties.stringPropertyNames())) {
            throw DocumentException.corrupt();
        }
        ManagedSecrets decoded;
        try {
            SecretValue metadata = SecretValue.of(
                    removeSpringPlaceholderEscapes(properties.getProperty(METADATA_PASSWORD)));
            decoded = properties.containsKey(TELEMETRY_PASSWORD)
                    ? ManagedSecrets.withTelemetryPassword(
                            metadata, SecretValue.of(removeSpringPlaceholderEscapes(
                                    properties.getProperty(TELEMETRY_PASSWORD))))
                    : ManagedSecrets.withoutTelemetryPassword(metadata);
        } catch (IllegalArgumentException exception) {
            throw DocumentException.invalid();
        }
        return new Decoded<>(decoded, body.generation());
    }

    private static void append(StringBuilder body, String key, SecretValue secret) {
        char[] copy = secret.copy();
        try {
            body.append(key).append('=').append(escape(copy)).append('\n');
        } finally {
            java.util.Arrays.fill(copy, '\0');
        }
    }

    private static String escape(char[] value) {
        StringBuilder escaped = new StringBuilder(value.length);
        for (int index = 0; index < value.length; index++) {
            char character = value[index];
            switch (character) {
                case '\\' -> escaped.append("\\\\");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                case '\f' -> escaped.append("\\f");
                case '=', ':' -> escaped.append('\\').append(character);
                case ' ' -> escaped.append(index == 0 ? "\\ " : " ");
                case '$' -> {
                    if (index + 1 < value.length && value[index + 1] == '{') {
                        // Properties decoding keeps one slash, which makes Spring treat ${...} literally.
                        escaped.append("\\\\");
                    }
                    escaped.append(character);
                }
                default -> escaped.append(character);
            }
        }
        return escaped.toString();
    }

    private static String removeSpringPlaceholderEscapes(String value) {
        StringBuilder decoded = new StringBuilder(value.length());
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character == '\\' && index + 2 < value.length()
                    && value.charAt(index + 1) == '$' && value.charAt(index + 2) == '{') {
                continue;
            }
            decoded.append(character);
        }
        return decoded.toString();
    }

    private static String springLiteral(SecretValue secret) {
        char[] copy = secret.copy();
        try {
            return Integrity.literalForSpring(new String(copy));
        } finally {
            java.util.Arrays.fill(copy, '\0');
        }
    }
}
