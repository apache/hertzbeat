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

package org.apache.hertzbeat.common.observability.gateway;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class SelfTelemetryPropertiesTest {
    @Test
    void separateDatabaseCheckUsesActualNormalizedExternalDestination() {
        var properties = configured("public");
        for (String external : Arrays.asList(null, "", " ", "public", "PUBLIC", " public ")) {
            assertThrows(IllegalArgumentException.class, () -> properties.validateAgainst(external));
        }
        properties.setDatabase("operations");
        assertThrows(IllegalArgumentException.class, () -> properties.validateAgainst(" operations "));
        assertDoesNotThrow(() -> configured("hertzbeat_self").validateAgainst(" public "));
    }

    @Test
    void rejectsDatabaseInjectionAndMissingExplicitWorkspace() {
        for (String database : List.of("self.db", "self;DROP DATABASE public", " self ", "")) {
            assertThrows(IllegalArgumentException.class, () -> configured(database).validateAgainst("public"));
        }
        var properties = configured("hertzbeat_self");
        properties.setWorkspaceId("");
        assertThrows(IllegalArgumentException.class, () -> properties.validateAgainst("public"));
    }

    @Test
    void disabledSelfDoesNotRequireNewConfigurationForLegacyClients() {
        assertDoesNotThrow(() -> new SelfTelemetryProperties().validateAgainst(null));
    }

    private static SelfTelemetryProperties configured(String database) {
        var properties = new SelfTelemetryProperties();
        properties.setEnabled(true);
        properties.setDatabase(database);
        properties.setWorkspaceId("operations");
        return properties;
    }
}
