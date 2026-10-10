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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.PublicAccessConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.SetupPublicAddress;
import org.apache.hertzbeat.manager.setup.workflow.MetadataConfigurationValidator.Validation;

/** Validates explicit public addresses without consulting request origin, host headers, or network state. */
final class PublicAccessConfigurationValidator {
    Validation validate(PublicAccessConfiguration configuration) {
        try {
            var publicBaseUrl = SetupPublicAddress.publicBaseUrl(configuration.publicBaseUrl());
            var http = SetupPublicAddress.serverOtlpEndpoint(configuration.serverOtlpHttpEndpoint());
            var grpc = SetupPublicAddress.serverOtlpEndpoint(configuration.serverOtlpGrpcEndpoint());
            if (publicBaseUrl.isEmpty() && http.isEmpty() && grpc.isEmpty()) {
                return Validation.failed(SetupErrorCode.PUBLIC_ADDRESS_INVALID);
            }
            List<SetupWarningCode> warnings = publicBaseUrl.filter(SetupPublicAddress::plaintextPublic).isPresent()
                    || http.filter(SetupPublicAddress::plaintextPublic).isPresent()
                    || grpc.filter(SetupPublicAddress::plaintextPublic).isPresent()
                    ? List.of(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT) : List.of();
            return new Validation(true, null, warnings);
        } catch (IllegalArgumentException failure) {
            return Validation.failed(SetupErrorCode.PUBLIC_ADDRESS_INVALID);
        }
    }
}
