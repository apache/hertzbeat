/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
