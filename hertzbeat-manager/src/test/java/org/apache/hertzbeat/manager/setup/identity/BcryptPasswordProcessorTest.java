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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.processor.exception.IncorrectCredentialsException;
import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.subject.Subject;
import com.usthe.sureness.subject.support.PasswordSubject;
import com.usthe.sureness.util.Md5Util;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BcryptPasswordProcessorTest {
    @Test
    void authenticatesPersistedBcryptCredentialOnRealPasswordSubjectPath() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        DatabaseAccount account = DatabaseAccount.firstAdministrator(
                "owner", new IdentityPasswordPolicy().encode("correct".toCharArray()), "admin");
        when(repository.findByUsername("owner")).thenReturn(Optional.of(account));
        DatabaseFirstAccountProvider provider = new DatabaseFirstAccountProvider(
                repository, mock(LegacyAccountSource.class));
        BcryptPasswordProcessor processor = new BcryptPasswordProcessor(provider,
                new AccountCredentialVerifier(new IdentityPasswordPolicy()));

        Subject authenticated = processor.authenticated(PasswordSubject.builder("owner", "correct").build());

        assertEquals(List.of("admin"), authenticated.getOwnRoles());
        assertThrows(IncorrectCredentialsException.class,
                () -> processor.authenticated(PasswordSubject.builder("owner", "wrong").build()));
        verify(repository, times(2)).findByUsername("owner");
    }

    @Test
    void verifiesLegacySaltWithOneLegacyProviderLoad() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        when(repository.findByUsername("legacy")).thenReturn(Optional.empty());
        when(legacy.loadAccount("legacy")).thenReturn(
                DefaultAccount.builder("legacy")
                        .setPassword(Md5Util.md5("correctsalt"))
                        .setSalt("salt").setOwnRoles(List.of("user")).build());
        BcryptPasswordProcessor processor = new BcryptPasswordProcessor(
                new DatabaseFirstAccountProvider(repository, legacy),
                new AccountCredentialVerifier(new IdentityPasswordPolicy()));

        Subject authenticated = processor.authenticated(PasswordSubject.builder("legacy", "correct").build());

        assertEquals(List.of("user"), authenticated.getOwnRoles());
        verify(legacy).loadAccount("legacy");
    }

    @Test
    void verifiesSaltedLegacyCredentialWithoutConvertingSuppliedArrayToString() {
        DefaultAccount legacy = DefaultAccount.builder("legacy")
                .setPassword(Md5Util.md5("correctsalt"))
                .setSalt("salt")
                .build();

        boolean matches = new AccountCredentialVerifier(new IdentityPasswordPolicy())
                .matches(legacy, "correct".toCharArray());

        assertTrue(matches);
    }
}
