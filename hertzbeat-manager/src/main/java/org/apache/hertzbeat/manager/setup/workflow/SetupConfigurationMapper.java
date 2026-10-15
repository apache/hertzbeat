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

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Maps inputs into a coordinator-owned bundle whose secrets never alias caller-owned values. */
final class SetupConfigurationMapper {
    private SetupConfigurationMapper() {
    }

    static ManagedConfigurationBundle map(ConfigurationRequest request) {
        var metadata = request.managementDatabase();
        var telemetry = request.telemetryStore();
        GreptimeSettings telemetrySettings = telemetry.username() == null
                ? GreptimeSettings.anonymous(endpoints(telemetry), telemetry.database())
                : GreptimeSettings.authenticated(endpoints(telemetry), telemetry.database(), telemetry.username());
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(metadata.kind(), metadata.jdbcUrl(), metadata.username()),
                telemetrySettings);
        SecretValue metadataPassword = SecretValue.of(metadata.password());
        ManagedSecrets secrets = telemetry.password() == null
                ? ManagedSecrets.withoutTelemetryPassword(metadataPassword)
                : ManagedSecrets.withTelemetryPassword(metadataPassword, SecretValue.of(telemetry.password()));
        return new ManagedConfigurationBundle(application, secrets);
    }

    static ManagedConfigurationBundle map(HeadlessSetupWorkflow.RequiredConfiguration request) {
        var telemetry = request.telemetry();
        GreptimeEndpoints endpoints = new GreptimeEndpoints(
                telemetry.grpcEndpoints(), telemetry.httpEndpoint());
        GreptimeSettings telemetrySettings = telemetry.username().isPresent()
                ? GreptimeSettings.authenticated(endpoints, telemetry.database(),
                        telemetry.username().orElseThrow())
                : GreptimeSettings.anonymous(endpoints, telemetry.database());
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(request.metadata().kind(), request.metadata().jdbcUrl(),
                        request.metadata().username()), telemetrySettings);
        return new ManagedConfigurationBundle(application,
                new ManagedSecrets(SecretValue.copyOf(request.metadata().password()),
                        telemetry.password().map(SecretValue::copyOf)));
    }

    private static GreptimeEndpoints endpoints(TelemetryStoreConfiguration telemetry) {
        return new GreptimeEndpoints(telemetry.grpcEndpoints(), telemetry.httpEndpoint());
    }
}
