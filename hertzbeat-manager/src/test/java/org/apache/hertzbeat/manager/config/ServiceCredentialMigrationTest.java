/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.AesUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class ServiceCredentialMigrationTest {

    private static final String TEST_SECRET = "0123456789abcdef";

    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        AesUtil.setDefaultSecretKey(TEST_SECRET);
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:credential-migration;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "sa",
                "");
        jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("DROP ALL OBJECTS");
        jdbcTemplate.execute("""
                CREATE TABLE hzb_monitor (
                    id BIGINT PRIMARY KEY,
                    app VARCHAR(100),
                    scrape VARCHAR(100)
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE hzb_param (
                    id BIGINT PRIMARY KEY,
                    monitor_id BIGINT,
                    field VARCHAR(100),
                    param_value VARCHAR(8126),
                    type TINYINT
                )
                """);
    }

    @AfterEach
    void tearDown() {
        AesUtil.setDefaultSecretKey(AesUtil.DEFAULT_ENCODE_RULES);
    }

    @Test
    void migratesLegacyCredentialsInTheDatabaseIdempotently() {
        jdbcTemplate.update("INSERT INTO hzb_monitor(id, app, scrape) VALUES (?, ?, ?)", 1L, "ollama", "static");
        jdbcTemplate.update("INSERT INTO hzb_monitor(id, app, scrape) VALUES (?, ?, ?)", 2L, "linux", "http_sd");
        jdbcTemplate.update("INSERT INTO hzb_monitor(id, app, scrape) VALUES (?, ?, ?)", 3L, "website", "static");
        jdbcTemplate.update("INSERT INTO hzb_monitor(id, app, scrape) VALUES (?, ?, ?)", 4L, "ollama", "static");
        String alreadyEncrypted = AesUtil.aesEncode("existing-ciphertext");
        jdbcTemplate.update("INSERT INTO hzb_param VALUES (?, ?, ?, ?, ?)",
                11L, 1L, "apiKey", "legacy-ollama-key", CommonConstants.PARAM_TYPE_STRING);
        jdbcTemplate.update("INSERT INTO hzb_param VALUES (?, ?, ?, ?, ?)",
                12L, 2L, "__sd_token__", "legacy-http-sd-token", CommonConstants.PARAM_TYPE_STRING);
        jdbcTemplate.update("INSERT INTO hzb_param VALUES (?, ?, ?, ?, ?)",
                13L, 3L, "apiKey", "ordinary-text", CommonConstants.PARAM_TYPE_STRING);
        jdbcTemplate.update("INSERT INTO hzb_param VALUES (?, ?, ?, ?, ?)",
                14L, 4L, "apiKey", alreadyEncrypted, CommonConstants.PARAM_TYPE_PASSWORD);

        ServiceCredentialMigration migration = new ServiceCredentialMigration(jdbcTemplate);
        assertEquals(2, migration.migrateStoredCredentials());

        Map<String, Object> ollama = jdbcTemplate.queryForMap(
                "SELECT param_value, type FROM hzb_param WHERE id = 11");
        Map<String, Object> httpSd = jdbcTemplate.queryForMap(
                "SELECT param_value, type FROM hzb_param WHERE id = 12");
        Map<String, Object> ordinary = jdbcTemplate.queryForMap(
                "SELECT param_value, type FROM hzb_param WHERE id = 13");
        Map<String, Object> encrypted = jdbcTemplate.queryForMap(
                "SELECT param_value, type FROM hzb_param WHERE id = 14");

        String ollamaCiphertext = String.valueOf(ollama.get("PARAM_VALUE"));
        String httpSdCiphertext = String.valueOf(httpSd.get("PARAM_VALUE"));
        assertNotEquals("legacy-ollama-key", ollamaCiphertext);
        assertNotEquals("legacy-http-sd-token", httpSdCiphertext);
        assertTrue(AesUtil.isCiphertext(ollamaCiphertext));
        assertTrue(AesUtil.isCiphertext(httpSdCiphertext));
        assertEquals("legacy-ollama-key", AesUtil.aesDecode(ollamaCiphertext));
        assertEquals("legacy-http-sd-token", AesUtil.aesDecode(httpSdCiphertext));
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, ((Number) ollama.get("TYPE")).byteValue());
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, ((Number) httpSd.get("TYPE")).byteValue());
        assertEquals("ordinary-text", ordinary.get("PARAM_VALUE"));
        assertEquals(CommonConstants.PARAM_TYPE_STRING, ((Number) ordinary.get("TYPE")).byteValue());
        assertEquals(alreadyEncrypted, encrypted.get("PARAM_VALUE"));

        assertEquals(0, migration.migrateStoredCredentials());
        assertEquals(ollamaCiphertext, jdbcTemplate.queryForObject(
                "SELECT param_value FROM hzb_param WHERE id = 11", String.class));
    }
}
