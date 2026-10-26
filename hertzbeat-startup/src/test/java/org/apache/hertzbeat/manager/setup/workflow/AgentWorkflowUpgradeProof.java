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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;

/** Reusable proof against disposable databases only; never called by application code. */
final class AgentWorkflowUpgradeProof {
    private AgentWorkflowUpgradeProof() { }

    static void verify(String url, String user, String password, String vendor, Path oldDirectory) throws Exception {
        // Only B200 is visible to the old installer; Flyway must not select B201.
        try (var source = AgentWorkflowUpgradeProof.class.getResourceAsStream(
                "/db/migration/" + vendor + "/B200__current_schema.sql")) {
            Files.copy(source, oldDirectory.resolve("B200__current_schema.sql"));
        }
        Flyway old = Flyway.configure().dataSource(url, user, password)
                .locations("filesystem:" + oldDirectory).load();
        assertThat(old.migrate().migrationsExecuted).isEqualTo(1);
        try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO hzb_config(type,content,config_revision) VALUES('agent-fixture','synthetic',1)");
            statement.execute("INSERT INTO hzb_agent_run(run_uid,session_id,message_id,entry_type,status) "
                    + "VALUES('old-run',1,'old-message','USER_INPUT','FAILED')");
        }
        Flyway current = Flyway.configure().dataSource(url, user, password)
                .locations("classpath:db/migration/" + vendor).cleanDisabled(false).load();
        try {
            assertThat(current.info().pending()).extracting(info -> info.getVersion().getVersion()).containsExactly("201");
            assertThat(current.migrate().migrationsExecuted).isEqualTo(1);
            current.validate();
            assertThat(current.migrate().migrationsExecuted).isZero();
            try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
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
            verifyReceiptRollback(url, user, password);
        } finally {
            current.clean();
        }
    }

    private static void verifyReceiptRollback(String url, String user, String password) throws Exception {
        try (var connection = DriverManager.getConnection(url, user, password)) {
            connection.setAutoCommit(false);
            try (var insert = connection.prepareStatement(
                    "INSERT INTO hzb_website_batch_item(id,input_hash,state,monitor_id,reason,version) VALUES(?,?,?,?,?,?)")) {
                insert.setString(1, "synthetic-receipt");
                insert.setString(2, "a".repeat(64));
                insert.setString(3, "VERIFIED");
                insert.setLong(4, 123L);
                insert.setString(5, "NATIVE_CREATE_READBACK");
                insert.setLong(6, 0L);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
            connection.rollback();
        }
        try (var connection = DriverManager.getConnection(url, user, password);
                var statement = connection.createStatement();
                var row = statement.executeQuery("SELECT COUNT(*) FROM hzb_website_batch_item")) {
            assertThat(row.next()).isTrue();
            assertThat(row.getLong(1)).isZero();
        }
    }
}
