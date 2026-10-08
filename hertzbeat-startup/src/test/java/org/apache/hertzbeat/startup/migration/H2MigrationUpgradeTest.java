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

package org.apache.hertzbeat.startup.migration;

import java.sql.SQLException;
import java.util.List;
import java.util.Set;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * Runs the 1.9.0 migration upgrade regression on H2, the default embedded database.
 */
@DisplayName("1.9.0 migration upgrade on H2")
class H2MigrationUpgradeTest extends AbstractMigrationUpgradeTest {

    private static final AtomicInteger DATABASE_SEQUENCE = new AtomicInteger();

    private DriverManagerDataSource dataSource;

    @BeforeEach
    void createDatabase() {
        // MODE=MYSQL matches the URL the shipped application.yml uses.
        dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:migration_" + DATABASE_SEQUENCE.incrementAndGet() + ";MODE=MYSQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        dataSource.setDriverClassName("org.h2.Driver");
    }

    @AfterEach
    void dropDatabase() throws SQLException {
        execute("SHUTDOWN");
    }

    @Override
    protected DataSource dataSource() {
        return dataSource;
    }

    @Override
    protected String vendor() {
        return "h2";
    }

    @Override
    protected String declaredType(String table, String column) throws SQLException {
        return queryString("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                        + "WHERE TABLE_NAME = ? AND COLUMN_NAME = ?",
                table.toUpperCase(Locale.ROOT), column.toUpperCase(Locale.ROOT));
    }

    @Override
    protected Set<String> expectedBooleanTypes() {
        return Set.of("boolean");
    }

    @Override
    protected String expectedEnlargedTextType() {
        return "character large object";
    }

    @Override
    protected List<String> storedRoutines() throws SQLException {
        return queryStrings("SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = 'PUBLIC'");
    }
}
