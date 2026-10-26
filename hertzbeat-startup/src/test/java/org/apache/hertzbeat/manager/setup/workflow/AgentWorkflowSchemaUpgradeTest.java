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
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AgentWorkflowSchemaUpgradeTest {
    @TempDir Path oldMigrationDirectory;

    @Test
    void upgradesV200WithoutReplacingDataOrGrantingPermissionAndEnforcesSingleChild() throws Exception {
        String url = "jdbc:h2:mem:agent-schema-" + UUID.randomUUID() + ";MODE=MYSQL;DB_CLOSE_DELAY=-1";
        // A true historical source location must not contain the newer B201 snapshot.
        try (var source = getClass().getResourceAsStream("/db/migration/h2/B200__current_schema.sql")) {
            Files.copy(source, oldMigrationDirectory.resolve("B200__current_schema.sql"));
        }
        Flyway old = Flyway.configure().dataSource(url, "sa", "")
                .locations("filesystem:" + oldMigrationDirectory).load();
        assertThat(old.migrate().migrationsExecuted).isEqualTo(1);
        try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO hzb_config(type,content,config_revision) VALUES('agent-fixture','synthetic',1)");
            statement.execute("INSERT INTO hzb_agent_run(run_uid,session_id,message_id,entry_type,status) "
                    + "VALUES('old-run',1,'old-message','USER_INPUT','FAILED')");
        }
        Flyway current = Flyway.configure().dataSource(url, "sa", "")
                .locations("classpath:db/migration/h2").cleanDisabled(false).load();
        try {
            assertThat(current.info().pending()).extracting(info -> info.getVersion().getVersion()).containsExactly("201");
            assertThat(current.migrate().migrationsExecuted).isEqualTo(1);
            current.validate();
            assertThat(current.migrate().migrationsExecuted).isZero();
            try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) {
                try (var row = statement.executeQuery("SELECT content FROM hzb_config WHERE type='agent-fixture'")) {
                    assertThat(row.next()).isTrue();
                    assertThat(row.getString(1)).isEqualTo("synthetic");
                }
                try (var row = statement.executeQuery("SELECT batch_root_run_uid FROM hzb_agent_run WHERE run_uid='old-run'")) {
                    assertThat(row.next()).isTrue();
                    assertThat(row.getString(1)).isNull();
                }
                for (String table : new String[]{"hzb_agent_permission_state", "hzb_agent_permission_audit", "hzb_website_batch_item"}) {
                    try (var count = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
                        assertThat(count.next()).isTrue();
                        assertThat(count.getInt(1)).isZero();
                    }
                }
                statement.execute("INSERT INTO hzb_agent_run(run_uid,session_id,message_id,entry_type,status,"
                        + "batch_root_run_uid,batch_parent_run_uid,batch_segment) "
                        + "VALUES('child',1,'child-message','USER_INPUT','FAILED','old-run','old-run',1)");
                assertThatThrownBy(() -> statement.execute("INSERT INTO hzb_agent_run(run_uid,session_id,message_id,"
                        + "entry_type,status,batch_root_run_uid,batch_parent_run_uid,batch_segment) "
                        + "VALUES('duplicate',1,'different-message','USER_INPUT','FAILED','old-run','old-run',2)"))
                        .isInstanceOf(SQLException.class);
            }
        } finally {
            current.clean();
        }
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
