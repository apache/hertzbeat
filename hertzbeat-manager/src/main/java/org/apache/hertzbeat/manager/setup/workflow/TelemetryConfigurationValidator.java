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

package org.apache.hertzbeat.manager.setup.workflow;

import java.net.URI;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.workflow.MetadataConfigurationValidator.Validation;

/** Validates the supported Greptime endpoint shapes without retaining credentials. */
final class TelemetryConfigurationValidator {
    Validation validate(TelemetryStoreConfiguration configuration) {
        return validate(configuration.grpcEndpoints(), configuration.httpEndpoint(),
                hasText(configuration.username()), hasText(configuration.password()));
    }

    Validation validate(String grpcEndpoints, String httpEndpoint,
                        boolean usernamePresent, boolean passwordPresent) {
        if (!hasHostAndPort(grpcEndpoints) || !isHttpUri(httpEndpoint)
                || usernamePresent != passwordPresent) {
            return Validation.failed(SetupErrorCode.TELEMETRY_CONNECTION_FAILED);
        }
        return Validation.success();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static boolean hasHostAndPort(String value) {
        int separator = value == null ? -1 : value.lastIndexOf(':');
        if (separator < 1 || separator == value.length() - 1) {
            return false;
        }
        try {
            int port = Integer.parseInt(value.substring(separator + 1));
            return port > 0 && port <= 65_535;
        } catch (NumberFormatException failure) {
            return false;
        }
    }

    private static boolean isHttpUri(String value) {
        try {
            URI uri = URI.create(value);
            return uri.getHost() != null && ("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()));
        } catch (IllegalArgumentException failure) {
            return false;
        }
    }
}
