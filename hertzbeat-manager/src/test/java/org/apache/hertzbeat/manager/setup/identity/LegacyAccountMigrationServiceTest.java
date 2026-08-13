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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.provider.DefaultAccount;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class LegacyAccountMigrationServiceTest {
    @Test
    void explicitlyMigratesFixedDefaultBeforeItCanUseNormalLogin() {
        Fixture fixture = fixture("admin", "hertzbeat");
        char[] oldPassword = "hertzbeat".toCharArray();
        char[] replacement = "new-owner-secret".toCharArray();

        fixture.service.migrate("admin", oldPassword, replacement);

        ArgumentCaptor<DatabaseAccount> saved = ArgumentCaptor.forClass(DatabaseAccount.class);
        verify(fixture.accounts).saveAndFlush(saved.capture());
        assertTrue(new BCryptPasswordEncoder().matches("new-owner-secret", saved.getValue().passwordHash()));
        verify(fixture.revocation).revokeFor("admin");
        assertTrue(allZero(oldPassword));
        assertTrue(allZero(replacement));
    }

    @Test
    void explicitlyMigratesCustomLegacyIdentity() {
        Fixture fixture = fixture("operator", "custom-secret");

        fixture.service.migrate("operator", "custom-secret".toCharArray(), "replacement".toCharArray());

        verify(fixture.accounts).saveAndFlush(any(DatabaseAccount.class));
        verify(fixture.revocation).revokeFor("operator");
    }

    @Test
    void customLegacyIdentityCanMigrateAfterTheFirstDatabaseAdministrator() {
        Fixture fixture = fixture("operator", "custom-secret");
        when(fixture.accounts.existsByBootstrapSlotIsNotNull()).thenReturn(true);

        fixture.service.migrate("operator", "custom-secret".toCharArray(), "replacement".toCharArray());

        verify(fixture.accounts).saveAndFlush(any(DatabaseAccount.class));
        verify(fixture.revocation).revokeFor("operator");
    }

    @Test
    void nonAdministratorMigrationDoesNotConsumeTheBootstrapAdministratorSlot() {
        Fixture fixture = fixture("operator", "custom-secret", List.of("guest"));

        fixture.service.migrate("operator", "custom-secret".toCharArray(), "replacement".toCharArray());

        ArgumentCaptor<DatabaseAccount> saved = ArgumentCaptor.forClass(DatabaseAccount.class);
        verify(fixture.accounts).saveAndFlush(saved.capture());
        assertTrue(saved.getValue().roleList().contains("guest"));
        assertFalse(saved.getValue().bootstrapAdministrator());
        verify(fixture.accounts, never()).existsByBootstrapSlotIsNotNull();
    }

    @Test
    void storageFailureDoesNotClaimRevocationOrMigration() {
        Fixture fixture = fixture("operator", "custom-secret");
        when(fixture.accounts.saveAndFlush(any())).thenThrow(new IllegalStateException("storage unavailable"));

        assertThrows(IllegalStateException.class,
                () -> fixture.service.migrate("operator", "custom-secret".toCharArray(), "replacement".toCharArray()));
        verify(fixture.revocation, never()).revokeFor("operator");
    }

    @Test
    void existingDatabaseIdentityStillClearsCallerPasswords() {
        Fixture fixture = fixture("operator", "custom-secret");
        when(fixture.accounts.existsByUsername("operator")).thenReturn(true);
        char[] legacy = "custom-secret".toCharArray();
        char[] replacement = "replacement".toCharArray();

        assertThrows(BootstrapIdentityConflict.class,
                () -> fixture.service.migrate("operator", legacy, replacement));

        assertTrue(allZero(legacy));
        assertTrue(allZero(replacement));
        verify(fixture.accounts, never()).saveAndFlush(any());
    }

    private static Fixture fixture(String username, String password) {
        return fixture(username, password, List.of("admin"));
    }

    private static Fixture fixture(String username, String password, List<String> roles) {
        DatabaseAccountRepository accounts = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        CredentialRevocation revocation = mock(CredentialRevocation.class);
        IdentityPasswordPolicy passwords = new IdentityPasswordPolicy();
        when(legacy.loadAccount(username)).thenReturn(DefaultAccount.builder(username).setPassword(password)
                .setOwnRoles(roles).build());
        return new Fixture(accounts, revocation, new LegacyAccountMigrationService(accounts, legacy,
                new AccountCredentialVerifier(passwords), revocation, passwords));
    }

    private static boolean allZero(char[] value) {
        for (char item : value) {
            if (item != '\0') {
                return false;
            }
        }
        return true;
    }

    private record Fixture(DatabaseAccountRepository accounts, CredentialRevocation revocation,
                           LegacyAccountMigrationService service) {
    }
}
