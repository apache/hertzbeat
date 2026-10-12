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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.SurenessContextHolder;
import io.jsonwebtoken.Claims;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import javax.naming.AuthenticationException;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityAccessTokenGateway;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.apache.hertzbeat.manager.setup.identity.AccountCredentialVerifier;
import org.apache.hertzbeat.manager.setup.identity.IdentityPasswordPolicy;
import org.apache.hertzbeat.manager.setup.identity.VersionedAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AccountCredentialVersionTest {
    private MutableVersionedAccount account;
    private AccountServiceImpl service;

    @BeforeEach
    void setUp() {
        JsonWebTokenUtil.setDefaultSecretKey("long-test-key-which-is-not-a-production-secret-1234567890");
        account = new MutableVersionedAccount();
        SurenessAccountProvider provider = username -> "owner".equals(username) ? account : null;
        service = new AccountServiceImpl(provider, mock(AuthTokenDao.class),
                new AccountCredentialVerifier(new IdentityPasswordPolicy()));
    }

    @Test
    void bcryptLoginCarriesCredentialVersionOnAccessAndRefreshTokens() throws Exception {
        Map<String, String> issued = service.authGetToken(
                LoginDto.builder().identifier("owner").credential("password").build());

        Claims access = JsonWebTokenUtil.parseJwt(issued.get("token"));
        Claims refresh = JsonWebTokenUtil.parseJwt(issued.get("refreshToken"));
        assertEquals(3L, access.get("credentialVersion", Long.class));
        assertEquals(3L, refresh.get("credentialVersion", Long.class));
        assertNull(service.checkSessionAccess("owner", List.of("admin"), 3L));
    }

    @Test
    void credentialChangeRejectsExistingAccessAndRefreshTokens() throws Exception {
        Map<String, String> issued = service.authGetToken(
                LoginDto.builder().identifier("owner").credential("password").build());
        account.version = 4;

        assertEquals("Token credentials are outdated", service.checkSessionAccess("owner", List.of("admin"), 3L));
        assertThrows(AuthenticationException.class, () -> service.refreshToken(issued.get("refreshToken")));
    }

    @Test
    void credentialChangeInvalidatesManagedApiTokenOwnerCheck() {
        assertNull(service.checkManagedTokenAccess("owner", List.of("admin"), 3L));
        account.version = 4;

        assertEquals("Token credentials are outdated",
                service.checkManagedTokenAccess("owner", List.of("admin"), 3L));
    }

    @Test
    void managedTokenUsesTheAccountSnapshotThatWasAuthorized() throws Exception {
        MutableVersionedAccount authorized = new MutableVersionedAccount();
        MutableVersionedAccount concurrentlyChanged = new MutableVersionedAccount();
        concurrentlyChanged.version = 4;
        AtomicInteger loads = new AtomicInteger();
        SurenessAccountProvider provider = username -> loads.getAndIncrement() == 0
                ? authorized : concurrentlyChanged;
        AccountServiceImpl accountService = new AccountServiceImpl(provider, mock(AuthTokenDao.class),
                new AccountCredentialVerifier(new IdentityPasswordPolicy()));
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("owner");

        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            String token = accountService.generateToken("automation", 3600L);

            Claims claims = JsonWebTokenUtil.parseJwt(token);
            assertEquals(3L, claims.get(
                    ObservabilityAccessTokenGateway.CLAIM_CREDENTIAL_VERSION, Long.class));
            assertEquals(1, loads.get());
        }
    }

    private static final class MutableVersionedAccount implements VersionedAccount {
        private final String password = new BCryptPasswordEncoder(12).encode("password");
        private long version = 3;

        @Override
        public String getAppId() { return "owner"; }

        @Override
        public String getPassword() { return password; }

        @Override
        public String getSalt() { return null; }

        @Override
        public List<String> getOwnRoles() { return List.of("admin"); }

        @Override
        public boolean isDisabledAccount() { return false; }

        @Override
        public boolean isExcessiveAttempts() { return false; }

        @Override
        public long credentialVersion() { return version; }

        @Override
        public boolean bcryptPassword() { return true; }
    }
}
