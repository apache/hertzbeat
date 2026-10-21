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

package org.apache.hertzbeat.observability.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import org.junit.jupiter.api.Test;

class OtelTraceIngressPropertiesTest {

    @Test
    void keepsIngressDisabledByDefaultWithoutRequiringCredentials() {
        OtelTraceIngressProperties properties = new OtelTraceIngressProperties();

        assertFalse(properties.isEnabled());
        assertDoesNotThrow(properties::validate);
    }

    @Test
    void acceptsOnlyAuthenticatedLoopbackTraceIngress() {
        OtelTraceIngressProperties properties = enabledProperties(
                "http://127.0.0.1:1161/api/otlp/v1/traces", "  intake-token  ");

        assertDoesNotThrow(properties::validate);
        assertEquals(URI.create("http://127.0.0.1:1161/api/otlp/v1/traces"), properties.validatedEndpoint());
        assertEquals("Bearer intake-token", properties.authorizationHeader());
        assertFalse(properties.toString().contains("intake-token"));
    }

    @Test
    void rejectsMissingTokenWithoutDisclosingConfiguredValue() {
        OtelTraceIngressProperties properties = enabledProperties(
                "http://127.0.0.1:1161/api/otlp/v1/traces", " ");

        IllegalStateException error = assertThrows(IllegalStateException.class, properties::validate);

        assertFalse(error.getMessage().contains("intake-token"));
    }

    @Test
    void rejectsNonLoopbackAndAmbiguousIngressEndpoints() {
        for (String endpoint : new String[] {
                "https://telemetry.example.test/api/otlp/v1/traces",
                "http://user@127.0.0.1:1161/api/otlp/v1/traces",
                "http://127.0.0.1:1161/api/otlp/v1/traces?workspace=default",
                "http://127.0.0.1:1161/api/otlp/v1/traces#fragment",
                "http://127.0.0.1:1161/api/otlp/v1/metrics",
                "ftp://127.0.0.1:1161/api/otlp/v1/traces"
        }) {
            OtelTraceIngressProperties properties = enabledProperties(endpoint, "intake-token");

            IllegalStateException error = assertThrows(IllegalStateException.class, properties::validate);

            assertFalse(error.getMessage().contains("intake-token"));
        }
    }

    private OtelTraceIngressProperties enabledProperties(String endpoint, String token) {
        OtelTraceIngressProperties properties = new OtelTraceIngressProperties();
        properties.setEnabled(true);
        properties.setEndpoint(URI.create(endpoint));
        properties.setToken(token);
        return properties;
    }
}
