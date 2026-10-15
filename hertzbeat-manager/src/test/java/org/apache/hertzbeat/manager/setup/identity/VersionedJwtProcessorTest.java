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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.processor.exception.ExpiredCredentialsException;
import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.subject.support.JwtSubject;
import com.usthe.sureness.util.JsonWebTokenUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.Test;

class VersionedJwtProcessorTest {
    @Test
    void directSurenessPathRejectsUiSessionFromOldCredentialGeneration() {
        JsonWebTokenUtil.setDefaultSecretKey("long-test-key-which-is-not-a-production-secret-1234567890");
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        IdentityPasswordPolicy passwords = new IdentityPasswordPolicy();
        DatabaseAccount account = DatabaseAccount.firstAdministrator(
                "owner", passwords.encode("password".toCharArray()), "admin");
        account.replacePassword(passwords.encode("replacement".toCharArray()));
        when(repository.findByUsername("owner")).thenReturn(Optional.of(account));
        DatabaseFirstAccountProvider provider = new DatabaseFirstAccountProvider(
                repository, mock(LegacyAccountSource.class));
        String token = JsonWebTokenUtil.issueJwt("owner", 3600L, List.of("admin"), new HashMap<>(Map.of(
                AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.UI_SESSION,
                "credentialVersion", 1L)));

        assertThrows(ExpiredCredentialsException.class,
                () -> new VersionedJwtProcessor(provider).authenticated(JwtSubject.builder(token).build()));
    }

    @Test
    void rejectsSessionWhenCurrentAccountIsMissing() {
        assertUnavailableAccount(null);
    }

    @Test
    void rejectsSessionWhenCurrentAccountIsDisabled() {
        SurenessAccount disabled = DefaultAccount.builder("owner").setPassword("unused")
                .setDisabledAccount(true).build();
        assertUnavailableAccount(disabled);
    }

    private static void assertUnavailableAccount(SurenessAccount account) {
        JsonWebTokenUtil.setDefaultSecretKey("long-test-key-which-is-not-a-production-secret-1234567890");
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        LegacyAccountSource legacy = mock(LegacyAccountSource.class);
        when(repository.findByUsername("owner")).thenReturn(Optional.empty());
        when(repository.count()).thenReturn(0L);
        when(legacy.loadAccount("owner")).thenReturn(account);
        DatabaseFirstAccountProvider provider = new DatabaseFirstAccountProvider(repository, legacy);
        String token = JsonWebTokenUtil.issueJwt("owner", 3600L, List.of("admin"), new HashMap<>(Map.of(
                AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.UI_SESSION,
                "credentialVersion", 3L)));
        assertThrows(ExpiredCredentialsException.class,
                () -> new VersionedJwtProcessor(provider).authenticated(JwtSubject.builder(token).build()));
    }
}
