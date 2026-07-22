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

package org.apache.hertzbeat.manager.instrumentation.intake;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Capability;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.State;

/** Exact version 1 input and persisted safe advertisement shape. */
public record CollectorIntakeAdvertisementRequest(int schemaVersion, Gateway gateway, List<Capability> capabilities,
                                                  String otlpHttpEndpoint, String otlpGrpcEndpoint) {

    public CollectorIntakeAdvertisementRequest {
        Objects.requireNonNull(gateway, "gateway");
        Objects.requireNonNull(capabilities, "capabilities");
        new CollectorInstrumentationIntake(
                schemaVersion,
                "validation",
                State.AVAILABLE,
                gateway,
                capabilities,
                otlpHttpEndpoint,
                otlpGrpcEndpoint,
                CollectorInstrumentationIntake.AUTHORIZATION_HEADER,
                null);
        capabilities = capabilities.stream()
                .sorted(Comparator.comparingInt(Capability::ordinal))
                .toList();
        otlpHttpEndpoint = normalizeEndpoint(otlpHttpEndpoint);
        otlpGrpcEndpoint = normalizeEndpoint(otlpGrpcEndpoint);
    }

    public CollectorInstrumentationIntake available(String collectorId) {
        return new CollectorInstrumentationIntake(
                schemaVersion,
                collectorId,
                State.AVAILABLE,
                gateway,
                capabilities,
                otlpHttpEndpoint,
                otlpGrpcEndpoint,
                CollectorInstrumentationIntake.AUTHORIZATION_HEADER,
                null);
    }

    private static String normalizeEndpoint(String endpoint) {
        if (endpoint == null) {
            return null;
        }
        URI uri = URI.create(endpoint).normalize();
        try {
            return new URI(
                    uri.getScheme().toLowerCase(Locale.ROOT),
                    null,
                    uri.getHost().toLowerCase(Locale.ROOT),
                    uri.getPort(),
                    uri.getPath(),
                    null,
                    null).toASCIIString();
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Instrumentation intake endpoint cannot be normalized");
        }
    }
}
