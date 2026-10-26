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

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.assertThat;

class AgentWorkflowSchemaUpgradeTest {
    @TempDir Path oldMigrationDirectory;

    @Test
    void upgradesV200WithoutReplacingDataOrGrantingPermissionAndEnforcesSingleChild() throws Exception {
        String url = "jdbc:h2:mem:agent-schema-" + UUID.randomUUID() + ";MODE=MYSQL;DB_CLOSE_DELAY=-1";
        AgentWorkflowUpgradeProof.verify(url, "sa", "", "h2", oldMigrationDirectory);
    }

    @Test
    void everySupportedVendorHasAdditiveWorkflowMigrationAndCurrentBaseline() throws Exception {
        for (String vendor : new String[]{"h2", "mysql", "postgresql"}) {
            try (var resource = getClass().getResourceAsStream("/db/migration/" + vendor + "/V201__create_agent_workflow_state.sql")) {
                assertThat(resource).isNotNull();
                String sql = new String(resource.readAllBytes(), StandardCharsets.UTF_8).toLowerCase();
                assertThat(sql).doesNotContain("drop table", "delete from", "update hzb_agent_permission_state");
                assertThat(sql).contains("hzb_agent_permission_state", "hzb_agent_permission_audit", "hzb_website_batch_item",
                        "batch_root_run_uid", "batch_parent_run_uid", "uk_agent_run_batch_parent", "uk_agent_run_batch_segment");
            }
            assertThat(getClass().getResource("/db/migration/" + vendor + "/B201__current_schema.sql")).isNotNull();
        }
    }
}
