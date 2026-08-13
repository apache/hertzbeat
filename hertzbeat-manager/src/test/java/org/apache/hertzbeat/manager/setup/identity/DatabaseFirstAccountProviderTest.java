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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccount;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DatabaseFirstAccountProviderTest {
    @Test
    void customLegacyIdentityRemainsAvailableUntilItIsMigrated() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        SurenessAccount legacyAccount = DefaultAccount.builder("custom").setPassword("custom-secret").build();
        when(repository.findByUsername("custom")).thenReturn(Optional.empty());
        when(legacy.loadAccount("custom")).thenReturn(legacyAccount);
        DatabaseFirstAccountProvider provider = new DatabaseFirstAccountProvider(repository, legacy);

        assertSame(legacyAccount, provider.loadAccount("custom"));

        verify(legacy).loadAccount("custom");
    }

    @Test
    void persistedIdentityAlwaysTakesPriority() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        DatabaseAccount database = new DatabaseAccount("operator", "hash", "admin,user", 7, (short) 1);
        when(repository.findByUsername("operator")).thenReturn(Optional.of(database));

        SurenessAccount result = new DatabaseFirstAccountProvider(repository, legacy).loadAccount("operator");

        assertEquals("operator", result.getAppId());
        assertEquals(List.of("admin", "user"), result.getOwnRoles());
        assertEquals(7, ((VersionedAccount) result).credentialVersion());
        verify(legacy, never()).loadAccount("operator");
    }

    @Test
    void digestAuthenticationNeverReceivesBcryptDatabaseCredential() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        DatabaseAccount database = new DatabaseAccount("operator", "bcrypt-hash", "admin", 1, (short) 1);
        when(repository.findByUsername("operator")).thenReturn(Optional.of(database));

        SurenessAccount result = new DatabaseFirstAccountProvider(repository, legacy)
                .loadLegacyAccountForDigest("operator");

        assertNull(result);
        verify(legacy, never()).loadAccount("operator");
    }

    @Test
    void legacyFixedDefaultCannotEnterNormalAuthentication() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        when(repository.findByUsername("admin")).thenReturn(Optional.empty());
        when(legacy.loadAccount("admin")).thenReturn(
                DefaultAccount.builder("admin").setPassword("hertzbeat").setOwnRoles(List.of("admin")).build());

        SurenessAccount result = new DatabaseFirstAccountProvider(repository, legacy).loadAccount("admin");

        assertTrue(result.isDisabledAccount());
        assertFalse(result.toString().contains("hertzbeat"));
    }
}
