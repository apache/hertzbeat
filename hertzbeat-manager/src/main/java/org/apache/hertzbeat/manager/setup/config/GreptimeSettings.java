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

/** Supported non-secret GreptimeDB settings, including anonymous local deployments. */
public record GreptimeSettings(GreptimeEndpoints endpoints, String database, Optional<String> username) {

    public GreptimeSettings {
        Objects.requireNonNull(endpoints, "endpoints");
        if (database == null || database.isBlank()) {
            throw new IllegalArgumentException("database must not be blank");
        }
        Objects.requireNonNull(username, "username");
        username = username.map(String::trim).filter(value -> !value.isEmpty());
    }

    public static GreptimeSettings anonymous(GreptimeEndpoints endpoints, String database) {
        return new GreptimeSettings(endpoints, database, Optional.empty());
    }

    public static GreptimeSettings authenticated(GreptimeEndpoints endpoints, String database, String username) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("username must not be blank");
        }
        return new GreptimeSettings(endpoints, database, Optional.of(username));
    }

    @Override
    public String toString() {
        return "GreptimeSettings[configured=true, authenticated=" + username.isPresent() + "]";
    }
}
