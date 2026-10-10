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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionalConfigurationSummary;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.SetupPublicAddress;

/** Projects persisted optional settings into the secret-free runtime and response shape. */
record OptionalConfigurationProjection(
        OptionalConfigurationSummary summary, List<SetupWarningCode> warnings) {

    static OptionalConfigurationProjection from(MetadataDatabaseKind databaseKind, OptionsRequest request) {
        OptionalConfigurationSummary summary = new OptionalConfigurationSummary(
                request.publicAccess() != null
                        && SetupPublicAddress.tryPublicBaseUrl(request.publicAccess().publicBaseUrl()).isPresent(),
                request.publicAccess() != null
                        && SetupPublicAddress.tryServerOtlpEndpoint(
                        request.publicAccess().serverOtlpHttpEndpoint()).isPresent(),
                request.publicAccess() != null
                        && SetupPublicAddress.tryServerOtlpEndpoint(
                        request.publicAccess().serverOtlpGrpcEndpoint()).isPresent(),
                request.retention() != null, request.mail() != null);
        return new OptionalConfigurationProjection(
                summary, SetupWarningPolicy.INSTANCE.evaluate(databaseKind, request));
    }

    OptionsResponse response() {
        return new OptionsResponse(summary.publicBaseUrlConfigured(), summary.serverOtlpHttpConfigured(),
                summary.serverOtlpGrpcConfigured(), summary.retentionConfigured(), summary.mailConfigured(),
                SetupPhase.OPTIONAL_CONFIGURATION);
    }
}
