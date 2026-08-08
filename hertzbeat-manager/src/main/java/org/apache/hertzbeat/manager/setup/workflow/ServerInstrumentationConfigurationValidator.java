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

import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ServerInstrumentationConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.ManagedOptionalConfiguration.ServerInstrumentationSettings;
import org.apache.hertzbeat.manager.setup.workflow.MetadataConfigurationValidator.Validation;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeEndpoint;

/** Validates optional server OTLP intake endpoints. */
final class ServerInstrumentationConfigurationValidator {
    Validation validate(ServerInstrumentationConfiguration configuration) {
        String http = ServerInstrumentationSettings.normalize(
                configuration.serverOtlpHttpEndpoint()).orElse(null);
        String grpc = ServerInstrumentationSettings.normalize(
                configuration.serverOtlpGrpcEndpoint()).orElse(null);
        if ((http == null && grpc == null) || !validEndpoint(http) || !validEndpoint(grpc)) {
            return Validation.failed(SetupErrorCode.SERVER_INSTRUMENTATION_INVALID);
        }
        List<SetupWarningCode> warnings = plaintext(http) || plaintext(grpc)
                ? List.of(SetupWarningCode.SERVER_OTLP_PLAINTEXT) : List.of();
        return new Validation(true, null, warnings);
    }

    private static boolean validEndpoint(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        try {
            IntakeEndpoint.fromUrl(value);
            return true;
        } catch (IllegalArgumentException failure) {
            return false;
        }
    }

    private static boolean plaintext(String value) {
        return value != null && value.regionMatches(true, 0, "http://", 0, 7);
    }

}
