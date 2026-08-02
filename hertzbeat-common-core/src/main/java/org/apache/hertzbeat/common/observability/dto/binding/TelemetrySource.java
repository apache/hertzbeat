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

package org.apache.hertzbeat.common.observability.dto.binding;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/**
 * Provenance of telemetry identity and evidence.
 */
public enum TelemetrySource {

    MONITOR("monitor"),
    OTLP("otlp");

    private final String value;

    TelemetrySource(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static TelemetrySource fromValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (TelemetrySource source : values()) {
            if (source.value.equals(normalized)) {
                return source;
            }
        }
        throw new IllegalArgumentException("Unsupported telemetry source");
    }

    public static TelemetrySource fromValueOrNull(String value) {
        try {
            return fromValue(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
