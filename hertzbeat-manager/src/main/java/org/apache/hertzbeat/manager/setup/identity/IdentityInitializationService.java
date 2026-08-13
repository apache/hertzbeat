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

import java.util.Arrays;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns the atomic first-administrator and explicit credential migration transitions. */
@Service
public class IdentityInitializationService {
    private final DatabaseAccountRepository accounts;
    private final CredentialRevocation revocation;
    private final IdentityPasswordPolicy passwords;

    public IdentityInitializationService(DatabaseAccountRepository accounts, CredentialRevocation revocation,
                                         IdentityPasswordPolicy passwords) {
        this.accounts = accounts;
        this.revocation = revocation;
        this.passwords = passwords;
    }

    @Transactional
    public void createFirstAdministrator(AdministratorCredentials credentials) {
        char[] clear = credentials.copyPassword();
        try {
            if (accounts.existsByBootstrapSlotIsNotNull()
                    || accounts.existsByUsername(credentials.canonicalUsername())) {
                throw new BootstrapIdentityConflict();
            }
            try {
                accounts.saveAndFlush(DatabaseAccount.firstAdministrator(
                        credentials.canonicalUsername(), passwords.encode(clear), "admin"));
            } catch (DataIntegrityViolationException exception) {
                throw BootstrapIdentityConflict.map(exception);
            }
        } finally {
            Arrays.fill(clear, '\0');
            credentials.close();
        }
    }

    /** Changes a password atomically and clears the caller-supplied character array. */
    @Transactional
    public void changePassword(String username, char[] password) {
        char[] clear = password == null ? new char[0] : password.clone();
        try {
            if (clear.length == 0) {
                throw new IllegalArgumentException("Password is required");
            }
            DatabaseAccount account = accounts.findByUsernameForUpdate(username)
                    .orElseThrow(() -> new IllegalArgumentException("Account does not exist"));
            account.replacePassword(passwords.encode(clear));
            accounts.save(account);
            revocation.revokeFor(username);
        } finally {
            Arrays.fill(clear, '\0');
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }
}
