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

import java.util.Objects;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Internal headless command boundary that keeps file passwords out of immutable DTO strings. */
public interface HeadlessSetupWorkflow {
    StatusResponse status();

    ConfigurationResponse configure(RequiredConfiguration configuration);

    void createAdministrator(String username, SecretValue password);

    void complete(List<SetupWarningCode> acknowledgedWarnings);

    /** Required managed configuration with secret values kept in clearable owners. */
    record RequiredConfiguration(ApplyMode applyMode, Metadata metadata, Telemetry telemetry) {
        public RequiredConfiguration {
            Objects.requireNonNull(applyMode, "applyMode");
            Objects.requireNonNull(metadata, "metadata");
            Objects.requireNonNull(telemetry, "telemetry");
        }
    }

    /** Headless metadata settings. */
    record Metadata(MetadataDatabaseKind kind, String jdbcUrl, String username, SecretValue password) {
    }

    /** Headless Greptime settings. */
    record Telemetry(String grpcEndpoints, String httpEndpoint, String database,
                     Optional<String> username, Optional<SecretValue> password) {
    }
}
