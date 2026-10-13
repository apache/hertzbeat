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

/** The only valid unit for applying or loading the separate application and secret documents. */
public record ManagedConfigurationBundle(
        ManagedApplicationConfig application, ManagedSecrets secrets) implements AutoCloseable {

    public ManagedConfigurationBundle {
        Objects.requireNonNull(application, "application");
        Objects.requireNonNull(secrets, "secrets");
        boolean telemetryUsername = application.telemetryStore().username().isPresent();
        boolean telemetryPassword = secrets.telemetryPassword().isPresent();
        if (telemetryUsername != telemetryPassword) {
            throw new IllegalArgumentException("Telemetry username and password must be configured together");
        }
        boolean mailUsername = application.optional().mail()
                .flatMap(ManagedOptionalConfiguration.MailSettings::username).isPresent();
        if (mailUsername != secrets.mailPassword().isPresent()) {
            throw new IllegalArgumentException("Mail username and password must be configured together");
        }
    }

    @Override
    public String toString() {
        return "ManagedConfigurationBundle[configured=true, secrets=<redacted>]";
    }

    @Override
    public void close() {
        secrets.close();
    }
}
