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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.HashMap;
import java.util.Map;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.dialect.H2Dialect;
import org.hibernate.dialect.MySQLDialect;
import org.hibernate.dialect.PostgreSQLDialect;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;

class MySqlJpaConfigurationTest {
    @Test
    void enablesNativeQuotingForExplicitMysqlAndCustomSubclassWithoutUrl() {
        for (Object dialect : new Object[]{MySQLDialect.class.getName(), MySQLDialect.class,
                CustomMySqlDialect.class.getName(), CustomMySqlDialect.class, new CustomMySqlDialect()}) {
            Map<String, Object> properties = new HashMap<>(Map.of(AvailableSettings.DIALECT, dialect));
            new MySqlJpaConfiguration().mysqlKeywordQuoting(new MockEnvironment()).customize(properties);
            assertEquals(true, properties.get(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"jdbc:mysql://localhost/hertzbeat", "jdbc:mysql:loadbalance://host1,host2/hertzbeat"})
    void recognizesMysqlUrlWhenHibernateAutoDetectsDialect(String url) {
        Map<String, Object> properties = new HashMap<>();
        new MySqlJpaConfiguration().mysqlKeywordQuoting(new MockEnvironment().withProperty("spring.datasource.url", url))
                .customize(properties);
        assertEquals(Map.of(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED, true), properties);
    }

    @Test
    void explicitH2AndPostgresqlDialectsKeepTheirIdentifierSemantics() {
        for (String dialect : new String[]{H2Dialect.class.getName(), PostgreSQLDialect.class.getName()}) {
            Map<String, Object> properties = new HashMap<>(Map.of(AvailableSettings.DIALECT, dialect));
            new MySqlJpaConfiguration().mysqlKeywordQuoting(
                    new MockEnvironment().withProperty("spring.datasource.url", "jdbc:mysql://localhost/hertzbeat"))
                    .customize(properties);
            assertEquals(Map.of(AvailableSettings.DIALECT, dialect), properties);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"MySQL", "MySQL8", "H2", "PostgreSQL"})
    void preservesNativeDialectAliases(String dialect) {
        Map<String, Object> properties = new HashMap<>(Map.of(AvailableSettings.DIALECT, dialect));
        new MySqlJpaConfiguration().mysqlKeywordQuoting(new MockEnvironment()).customize(properties);
        assertEquals(dialect.startsWith("MySQL"), properties.containsKey(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED));
        assertEquals(dialect, properties.get(AvailableSettings.DIALECT));
    }

    @Test
    void freshHibernateSettingsFollowDatabaseSwitchesWithoutRetainedMysqlState() {
        MockEnvironment environment = new MockEnvironment();
        var customizer = new MySqlJpaConfiguration().mysqlKeywordQuoting(environment);
        for (String url : new String[]{"jdbc:mysql://localhost/hertzbeat", "jdbc:h2:mem:proof", "jdbc:postgresql://localhost/hertzbeat"}) {
            environment.setProperty("spring.datasource.url", url);
            Map<String, Object> properties = new HashMap<>();
            customizer.customize(properties);
            assertEquals(url.startsWith("jdbc:mysql:") ? Map.of(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED, true) : Map.of(), properties);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "false"})
    void preservesExplicitOperatorKeywordSetting(String enabled) {
        Map<String, Object> properties = new HashMap<>(Map.of(AvailableSettings.DIALECT, MySQLDialect.class.getName(),
                AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED, enabled));
        new MySqlJpaConfiguration().mysqlKeywordQuoting(new MockEnvironment()).customize(properties);
        assertEquals(enabled, properties.get(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED));
    }

    @Test
    void absentBootUrlAndDialectDoesNotGuessDatasourceVendor() {
        Map<String, Object> properties = new HashMap<>();
        new MySqlJpaConfiguration().mysqlKeywordQuoting(new MockEnvironment()).customize(properties);
        assertFalse(properties.containsKey(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED));
    }

    public static class CustomMySqlDialect extends MySQLDialect {
    }
}
