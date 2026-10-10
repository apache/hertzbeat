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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class IdentityInitializationServiceTest {
    @Test
    void administratorUsernameUsesCanonicalDatabaseBoundaryAndRejectsOverflow() {
        try (AdministratorCredentials maximum = new AdministratorCredentials(
                " xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ",
                "secret".toCharArray())) {
            assertEquals("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    maximum.canonicalUsername());
        }
        assertThrows(InvalidAdministratorUsername.class,
                () -> new AdministratorCredentials("   ", "secret".toCharArray()));
        assertThrows(InvalidAdministratorUsername.class,
                () -> new AdministratorCredentials(
                        "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        "secret".toCharArray()));
    }

    @Test
    void createsUniqueFirstAdministratorWithCostTwelveHash() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        CredentialRevocation revocation = mock(CredentialRevocation.class);
        when(repository.existsByUsername("owner")).thenReturn(false);
        IdentityInitializationService service = new IdentityInitializationService(
                repository, revocation, new IdentityPasswordPolicy());

        service.createFirstAdministrator(new AdministratorCredentials(" owner ", "correct horse".toCharArray()));

        ArgumentCaptor<DatabaseAccount> saved = ArgumentCaptor.forClass(DatabaseAccount.class);
        verify(repository).saveAndFlush(saved.capture());
        assertEquals("owner", saved.getValue().username());
        assertTrue(saved.getValue().passwordHash().startsWith("$2a$12$"));
        assertTrue(new BCryptPasswordEncoder().matches("correct horse", saved.getValue().passwordHash()));
        assertFalse(saved.getValue().toString().contains("correct horse"));
    }

    @Test
    void refusesSecondAdministrator() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        when(repository.existsByBootstrapSlotIsNotNull()).thenReturn(true);
        IdentityInitializationService service = new IdentityInitializationService(
                repository, mock(CredentialRevocation.class), new IdentityPasswordPolicy());
        AdministratorCredentials credentials = new AdministratorCredentials("other", "secret".toCharArray());

        assertThrows(IllegalStateException.class,
                () -> service.createFirstAdministrator(credentials));
        assertTrue(allZero(credentials.copyPassword()));
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void createsBootstrapAdministratorAfterAnOrdinaryLegacyIdentityMigrates() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        when(repository.existsByBootstrapSlotIsNotNull()).thenReturn(false);
        when(repository.existsByUsername("owner")).thenReturn(false);
        IdentityInitializationService service = new IdentityInitializationService(
                repository, mock(CredentialRevocation.class), new IdentityPasswordPolicy());

        service.createFirstAdministrator(new AdministratorCredentials("owner", "secret".toCharArray()));

        ArgumentCaptor<DatabaseAccount> saved = ArgumentCaptor.forClass(DatabaseAccount.class);
        verify(repository).saveAndFlush(saved.capture());
        assertTrue(saved.getValue().bootstrapAdministrator());
    }

    @Test
    void missingAccountStillClearsReplacementPassword() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        when(repository.findByUsernameForUpdate("missing")).thenReturn(Optional.empty());
        IdentityInitializationService service = new IdentityInitializationService(
                repository, mock(CredentialRevocation.class), new IdentityPasswordPolicy());
        char[] replacement = "new-secret".toCharArray();

        assertThrows(IllegalArgumentException.class, () -> service.changePassword("missing", replacement));

        assertTrue(allZero(replacement));
    }

    @Test
    void revokesOnlyAfterCredentialVersionIsPersisted() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        CredentialRevocation revocation = mock(CredentialRevocation.class);
        DatabaseAccount account = new DatabaseAccount("owner", "old", "admin", 3, (short) 1);
        when(repository.findByUsernameForUpdate("owner")).thenReturn(Optional.of(account));
        when(repository.save(account)).thenThrow(new IllegalStateException("storage unavailable"));
        IdentityInitializationService service = new IdentityInitializationService(
                repository, revocation, new IdentityPasswordPolicy());

        char[] replacement = "new-secret".toCharArray();
        assertThrows(IllegalStateException.class, () -> service.changePassword("owner", replacement));
        assertEquals(4, account.credentialVersion());
        assertTrue(allZero(replacement));
        verify(revocation, never()).revokeFor("owner");
    }

    @Test
    void mapsConcurrentBootstrapConstraintToStableConflict() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        when(repository.existsByUsername("owner")).thenReturn(false);
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate",
                new java.sql.SQLException("unique", "23505")));
        IdentityInitializationService service = new IdentityInitializationService(repository,
                mock(CredentialRevocation.class), new IdentityPasswordPolicy());

        assertThrows(BootstrapIdentityConflict.class,
                () -> service.createFirstAdministrator(
                        new AdministratorCredentials("owner", "secret".toCharArray())));
    }

    private static boolean allZero(char[] value) {
        for (char item : value) {
            if (item != '\0') {
                return false;
            }
        }
        return true;
    }
}
