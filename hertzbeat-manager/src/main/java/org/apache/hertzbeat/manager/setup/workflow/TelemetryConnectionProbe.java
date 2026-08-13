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
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Injectable live Greptime connectivity and authentication boundary. */
@FunctionalInterface
public interface TelemetryConnectionProbe {
    Optional<SetupErrorCode> probe(Request configuration);

    default Optional<SetupErrorCode> probe(TelemetryStoreConfiguration configuration) {
        Optional<SecretValue> password = configuration.password() == null
                ? Optional.empty() : Optional.of(SecretValue.of(configuration.password()));
        try (Request request = new Request(configuration.kind(), configuration.grpcEndpoints(),
                configuration.httpEndpoint(), configuration.database(),
                Optional.ofNullable(configuration.username()), password)) {
            return probe(request);
        }
    }

    default Optional<SetupErrorCode> probe(HeadlessSetupWorkflow.Telemetry configuration) {
        try (Request request = new Request(TelemetryStoreKind.GREPTIME,
                configuration.grpcEndpoints(), configuration.httpEndpoint(), configuration.database(),
                configuration.username(), configuration.password().map(SecretValue::copyOf))) {
            return probe(request);
        }
    }

    /** Probe-scoped clearable credentials; the probe must not retain this request after return. */
    record Request(TelemetryStoreKind kind, String grpcEndpoints, String httpEndpoint, String database,
                   Optional<String> username, Optional<SecretValue> password) implements AutoCloseable {
        public Request {
            Objects.requireNonNull(username, "username");
            Objects.requireNonNull(password, "password");
        }

        @Override
        public void close() {
            password.ifPresent(SecretValue::close);
        }
    }
}
