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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Supported non-secret metadata database settings. */
public record MetadataDatabaseSettings(MetadataDatabaseKind kind, String jdbcUrl, String username) {

    public MetadataDatabaseSettings {
        Objects.requireNonNull(kind, "kind");
        requireText(jdbcUrl, "jdbcUrl");
        requireText(username, "username");
    }

    @Override
    public String toString() {
        return "MetadataDatabaseSettings[kind=" + kind + ", configured=true]";
    }

    private static void requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
