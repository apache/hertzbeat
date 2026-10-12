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
import com.usthe.sureness.provider.SurenessAccountProvider;
import java.util.List;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Resolves a persisted identity before the legacy source for the same username. A migrated
 * identity must be disabled instead of physically deleted so its legacy definition cannot
 * reappear; unmigrated custom legacy identities remain usable during an upgrade.
 */
@Component
@Primary
public class DatabaseFirstAccountProvider implements SurenessAccountProvider {

    private final DatabaseAccountRepository accounts;
    private final LegacyAccountSource legacyAccounts;

    public DatabaseFirstAccountProvider(DatabaseAccountRepository accounts, LegacyAccountSource legacyAccounts) {
        this.accounts = accounts;
        this.legacyAccounts = legacyAccounts;
    }

    @Override
    public SurenessAccount loadAccount(String username) {
        SurenessAccount persisted = accounts.findByUsername(username).<SurenessAccount>map(PersistedAccount::new)
                .orElse(null);
        if (persisted != null) {
            return persisted;
        }
        SurenessAccount legacy = legacyAccounts.loadAccount(username);
        return isLegacyDefault(legacy) ? new MigrationRequiredAccount(legacy) : legacy;
    }

    /** HTTP Digest cannot derive its response from a persisted BCrypt credential. */
    SurenessAccount loadLegacyAccountForDigest(String username) {
        SurenessAccount account = loadAccount(username);
        return account instanceof VersionedAccount ? null : account;
    }

    private static boolean isLegacyDefault(SurenessAccount account) {
        return account != null && "admin".equals(account.getAppId()) && "hertzbeat".equals(account.getPassword())
                && (account.getSalt() == null || account.getSalt().isBlank());
    }

    private record MigrationRequiredAccount(SurenessAccount legacy) implements SurenessAccount {
        @Override
        public String getAppId() {
            return legacy.getAppId();
        }

        @Override
        public String getPassword() {
            return legacy.getPassword();
        }

        @Override
        public String getSalt() {
            return legacy.getSalt();
        }

        @Override
        public List<String> getOwnRoles() {
            return legacy.getOwnRoles();
        }

        @Override
        public boolean isDisabledAccount() {
            return true;
        }

        @Override
        public boolean isExcessiveAttempts() {
            return false;
        }

        @Override
        public String toString() {
            return "MigrationRequiredAccount[username=admin]";
        }
    }

    private record PersistedAccount(DatabaseAccount account) implements VersionedAccount {
        @Override
        public String getAppId() {
            return account.username();
        }

        @Override
        public String getPassword() {
            return account.passwordHash();
        }

        @Override
        public String getSalt() {
            return null;
        }

        @Override
        public List<String> getOwnRoles() {
            return account.roleList();
        }

        @Override
        public boolean isDisabledAccount() {
            return account.disabled();
        }

        @Override
        public boolean isExcessiveAttempts() {
            return false;
        }

        @Override
        public long credentialVersion() {
            return account.credentialVersion();
        }

        @Override
        public boolean bcryptPassword() {
            return true;
        }

        @Override
        public String toString() {
            return "PersistedAccount[username=" + account.username() + "]";
        }
    }
}
