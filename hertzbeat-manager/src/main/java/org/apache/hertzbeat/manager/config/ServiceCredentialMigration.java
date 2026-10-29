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

import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.AesUtil;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Encrypts credentials that were stored before their template parameter type
 * was classified as a password.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class ServiceCredentialMigration implements CommandLineRunner {

    private static final String MIGRATION_MARKER = "migration.service-credentials.v1";

    private static final String FIND_CREDENTIALS_SQL = """
            SELECT p.id, p.param_value, p.type
            FROM hzb_param p
            INNER JOIN hzb_monitor m ON m.id = p.monitor_id
            WHERE (m.app = 'ollama' AND p.field = 'apiKey')
               OR (m.scrape = 'http_sd' AND p.field = '__sd_token__')
            """;

    private static final String UPDATE_CREDENTIAL_SQL =
            "UPDATE hzb_param SET param_value = ?, type = ? WHERE id = ?";

    private final JdbcTemplate jdbcTemplate;

    public ServiceCredentialMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(String... args) {
        if (isMigrationComplete()) {
            return;
        }
        MigrationResult result = migrateStoredCredentials();
        if (result.unresolved() == 0) {
            jdbcTemplate.update("INSERT INTO hzb_config(type, content) VALUES (?, ?)",
                    MIGRATION_MARKER, "complete");
        } else {
            log.error("Credential migration left {} unresolved parameter(s) unchanged; "
                    + "the migration will retry on the next start", result.unresolved());
        }
        if (result.migrated() > 0) {
            log.info("Migrated {} stored service credential parameters", result.migrated());
        }
    }

    private boolean isMigrationComplete() {
        Integer markerCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hzb_config WHERE type = ?",
                Integer.class,
                MIGRATION_MARKER);
        return markerCount != null && markerCount > 0;
    }

    MigrationResult migrateStoredCredentials() {
        List<StoredCredential> credentials = jdbcTemplate.query(FIND_CREDENTIALS_SQL,
                (resultSet, rowNumber) -> new StoredCredential(
                        resultSet.getLong("id"),
                        resultSet.getString("param_value"),
                        resultSet.getByte("type")));
        int migrated = 0;
        int unresolved = 0;
        for (StoredCredential credential : credentials) {
            String value = credential.value();
            boolean passwordType = credential.type() == CommonConstants.PARAM_TYPE_PASSWORD;
            boolean encrypted;
            try {
                encrypted = !StringUtils.hasText(value) || isSupportedCiphertext(value);
            } catch (IllegalStateException e) {
                logUnresolvedCredential(credential.id());
                unresolved++;
                continue;
            }
            if (passwordType && encrypted) {
                continue;
            }
            String valueToStore = value;
            if (StringUtils.hasText(value) && !encrypted) {
                try {
                    valueToStore = AesUtil.aesEncode(value);
                    if (!AesUtil.isCiphertext(valueToStore)) {
                        throw new IllegalStateException("Could not encrypt a stored service credential");
                    }
                } catch (IllegalStateException e) {
                    logUnresolvedCredential(credential.id());
                    unresolved++;
                    continue;
                }
            }
            jdbcTemplate.update(UPDATE_CREDENTIAL_SQL,
                    valueToStore,
                    CommonConstants.PARAM_TYPE_PASSWORD,
                    credential.id());
            migrated++;
        }
        return new MigrationResult(migrated, unresolved);
    }

    record MigrationResult(int migrated, int unresolved) {}

    private void logUnresolvedCredential(long id) {
        log.error("Skipping service credential migration for hzb_param id {} because it could not be handled safely. "
                + "Verify the original common.secret or re-enter the credential; "
                + "the row was left unchanged", id);
    }

    private boolean isSupportedCiphertext(String value) {
        if (AesUtil.isCiphertext(value)) {
            return true;
        }
        return !AesUtil.DEFAULT_ENCODE_RULES.equals(AesUtil.getDefaultSecretKey())
                && AesUtil.isCiphertext(value, AesUtil.DEFAULT_ENCODE_RULES);
    }

    private record StoredCredential(long id, String value, byte type) {
    }
}
