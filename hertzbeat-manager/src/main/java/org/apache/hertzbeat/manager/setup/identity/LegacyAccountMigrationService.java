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

package org.apache.hertzbeat.manager.setup.identity;

import com.usthe.sureness.provider.SurenessAccount;
import java.util.Arrays;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicitly replaces one verified legacy identity with a database-owned identity. */
@Service
public class LegacyAccountMigrationService {
    private final DatabaseAccountRepository accounts;
    private final LegacyAccountSource legacyAccounts;
    private final AccountCredentialVerifier verifier;
    private final CredentialRevocation revocation;
    private final IdentityPasswordPolicy passwords;

    public LegacyAccountMigrationService(DatabaseAccountRepository accounts, LegacyAccountSource legacyAccounts,
                                         AccountCredentialVerifier verifier, CredentialRevocation revocation,
                                         IdentityPasswordPolicy passwords) {
        this.accounts = accounts;
        this.legacyAccounts = legacyAccounts;
        this.verifier = verifier;
        this.revocation = revocation;
        this.passwords = passwords;
    }

    /** Replaces a legacy credential and clears both caller-supplied password arrays. */
    @Transactional
    public void migrate(String username, char[] legacyPassword, char[] replacementPassword) {
        char[] legacy = legacyPassword == null ? new char[0] : legacyPassword.clone();
        char[] replacement = replacementPassword == null ? new char[0] : replacementPassword.clone();
        try {
            if (accounts.existsByUsername(username)) {
                throw new BootstrapIdentityConflict();
            }
            SurenessAccount source = legacyAccounts.loadAccount(username);
            if (!verifier.matches(source, legacy)) {
                throw new IllegalArgumentException("Legacy credential is invalid");
            }
            if (replacement.length == 0) {
                throw new IllegalArgumentException("Replacement password is required");
            }
            String roles = String.join(",", source.getOwnRoles());
            try {
                String passwordHash = passwords.encode(replacement);
                boolean claimsBootstrapAdministrator = source.getOwnRoles().contains("admin")
                        && !accounts.existsByBootstrapSlotIsNotNull();
                DatabaseAccount migrated = claimsBootstrapAdministrator
                        ? DatabaseAccount.firstAdministrator(username, passwordHash, roles)
                        : DatabaseAccount.ordinary(username, passwordHash, roles);
                accounts.saveAndFlush(migrated);
            } catch (DataIntegrityViolationException exception) {
                throw BootstrapIdentityConflict.map(exception);
            }
            revocation.revokeFor(username);
        } finally {
            Arrays.fill(legacy, '\0');
            Arrays.fill(replacement, '\0');
            if (legacyPassword != null) {
                Arrays.fill(legacyPassword, '\0');
            }
            if (replacementPassword != null) {
                Arrays.fill(replacementPassword, '\0');
            }
        }
    }
}
