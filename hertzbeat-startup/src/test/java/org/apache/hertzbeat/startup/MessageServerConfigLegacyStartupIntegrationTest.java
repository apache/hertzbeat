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

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/** Startup upgrade contract for message-server rows created before config revisions existed. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(classes = HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:legacy-config-revision-startup;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa",
    "spring.datasource.password=123456",
    "spring.jpa.hibernate.ddl-auto=update",
    "spring.flyway.enabled=true",
    "spring.flyway.baseline-on-migrate=true",
    "spring.flyway.baseline-version=203",
    "spring.flyway.locations=classpath:db/migration/h2",
    "warehouse.store.duckdb.enabled=false"
})
class MessageServerConfigLegacyStartupIntegrationTest {

    private static final String JDBC_URL =
            "jdbc:h2:mem:legacy-config-revision-startup;MODE=MySQL;DB_CLOSE_DELAY=-1";
    private static final String EMAIL_CONTENT = "{\"host\":\"legacy-mail.example.test\"}";
    private static final String SMS_CONTENT = "{\"provider\":\"legacy-sms\"}";

    static {
        seedLegacyConfigRows();
    }

    @Autowired
    private GeneralConfigDao generalConfigDao;

    @Autowired
    private javax.sql.DataSource dataSource;

    @Test
    void startupBackfillsLegacyRowsBeforeUsingTheRevisionColumn() throws Exception {
        GeneralConfig email = generalConfigDao.findByType("email");
        GeneralConfig sms = generalConfigDao.findByType("sms");
        assertNotNull(email);
        assertNotNull(sms);
        assertEquals(EMAIL_CONTENT, email.getContent());
        assertEquals(SMS_CONTENT, sms.getContent());
        assertNotNull(email.getRevision());
        assertNotNull(sms.getRevision());
        assertNotEquals(email.getRevision(), sms.getRevision());

        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet column = statement.executeQuery("""
                        SELECT IS_NULLABLE
                          FROM INFORMATION_SCHEMA.COLUMNS
                         WHERE TABLE_NAME = 'HZB_CONFIG'
                           AND COLUMN_NAME = 'CONFIG_REVISION'
                        """)) {
            assertTrue(column.next());
            assertEquals("NO", column.getString("IS_NULLABLE"));
        }
    }

    private static void seedLegacyConfigRows() {
        try (Connection connection = DriverManager.getConnection(JDBC_URL, "sa", "123456");
                Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE hzb_config (
                        type VARCHAR(255) PRIMARY KEY,
                        content VARCHAR(8192),
                        creator VARCHAR(255),
                        modifier VARCHAR(255),
                        gmt_create TIMESTAMP,
                        gmt_update TIMESTAMP
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO hzb_config(type, content)
                    VALUES ('email', '{"host":"legacy-mail.example.test"}'),
                           ('sms', '{"provider":"legacy-sms"}')
                    """);
        } catch (SQLException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }
}
