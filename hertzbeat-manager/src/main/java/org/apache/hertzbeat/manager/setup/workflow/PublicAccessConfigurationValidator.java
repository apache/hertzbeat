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
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.PublicAccessConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.workflow.MetadataConfigurationValidator.Validation;

/** Validates optional public endpoint URIs and reports plaintext exposure explicitly. */
final class PublicAccessConfigurationValidator {
    Validation validate(PublicAccessConfiguration configuration) {
        List<SetupWarningCode> warnings = new ArrayList<>();
        for (String value : List.of(nullToEmpty(configuration.publicBaseUrl()),
                nullToEmpty(configuration.serverOtlpHttpEndpoint()))) {
            if (value.isEmpty()) {
                continue;
            }
            URI uri;
            try {
                uri = URI.create(value);
            } catch (IllegalArgumentException failure) {
                return Validation.failed(SetupErrorCode.PUBLIC_ADDRESS_INVALID);
            }
            if (uri.getHost() == null || !("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()))) {
                return Validation.failed(SetupErrorCode.PUBLIC_ADDRESS_INVALID);
            }
            if ("http".equalsIgnoreCase(uri.getScheme())) {
                warnings.add(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT);
            }
        }
        String grpc = configuration.serverOtlpGrpcEndpoint();
        if (grpc != null && !grpc.isBlank() && !validHostPort(grpc)) {
            return Validation.failed(SetupErrorCode.PUBLIC_ADDRESS_INVALID);
        }
        return new Validation(true, null, List.copyOf(warnings));
    }

    private static boolean validHostPort(String value) {
        int separator = value.lastIndexOf(':');
        if (separator < 1 || separator == value.length() - 1 || value.indexOf('/') >= 0
                || value.substring(0, separator).isBlank() || value.substring(0, separator).contains(" ")) {
            return false;
        }
        try {
            int port = Integer.parseInt(value.substring(separator + 1));
            return port > 0 && port <= 65_535;
        } catch (NumberFormatException failure) {
            return false;
        }
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
