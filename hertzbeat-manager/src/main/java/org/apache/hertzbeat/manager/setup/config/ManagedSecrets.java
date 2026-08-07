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

package org.apache.hertzbeat.manager.setup.config;

import java.util.Objects;
import java.util.Optional;

/** Setup-owned secrets stored outside the managed application overlay. */
public record ManagedSecrets(SecretValue metadataDatabasePassword, Optional<SecretValue> telemetryPassword) {

    public ManagedSecrets {
        Objects.requireNonNull(metadataDatabasePassword, "metadataDatabasePassword");
        Objects.requireNonNull(telemetryPassword, "telemetryPassword");
    }

    public static ManagedSecrets withoutTelemetryPassword(SecretValue metadataDatabasePassword) {
        return new ManagedSecrets(metadataDatabasePassword, Optional.empty());
    }

    public static ManagedSecrets withTelemetryPassword(
            SecretValue metadataDatabasePassword, SecretValue telemetryPassword) {
        return new ManagedSecrets(metadataDatabasePassword, Optional.of(telemetryPassword));
    }

    @Override
    public String toString() {
        return "ManagedSecrets[metadataDatabasePassword=<redacted>, telemetryPassword=<redacted>]";
    }
}
