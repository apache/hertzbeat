/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SignalDashboardSchemaResourceTest {
    @ParameterizedTest
    @ValueSource(strings = {"h2/V200__create_entity_foundation.sql", "mysql/V200__create_entity_foundation.sql",
        "postgresql/V200__create_entity_foundation.sql", "mysql/B200__current_schema.sql", "postgresql/B200__current_schema.sql"})
    void allCreationPathsDeclareTextDocumentAndNativeRevision(String path) throws IOException {
        try (var input = getClass().getResourceAsStream("/db/migration/" + path)) {
            assertNotNull(input);
            String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            int start = sql.indexOf("hzb_signal_dashboard (");
            String table = sql.substring(start, sql.indexOf(';', start));
            assertTrue(table.contains("document TEXT,"), path);
            assertTrue(table.contains("revision BIGINT NOT NULL DEFAULT 0,"), path);
        }
    }
}
