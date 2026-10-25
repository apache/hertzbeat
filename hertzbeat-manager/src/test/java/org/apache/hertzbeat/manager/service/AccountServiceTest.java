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

import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import com.usthe.sureness.util.SurenessContextHolder;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.MalformedJwtException;
import org.apache.hertzbeat.alert.util.CryptoUtils;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import javax.naming.AuthenticationException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * test case for {@link AccountServiceImpl}
 */

class AccountServiceTest {

    private AccountServiceImpl accountService;

    private SurenessAccountProvider accountProvider;

    private AuthTokenDao authTokenDao;

    private final String identifier = "admin";
    private final String password = "hertzbeat";
    private final String salt = "salt1";
    private final List<String> roles = List.of("admin");

    private final String jwt = """
              CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R
              LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9
              8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5
              dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp
            """;

    @BeforeEach
    void setUp() {

        accountProvider = mock(SurenessAccountProvider.class);
        authTokenDao = mock(AuthTokenDao.class);
        accountService = new AccountServiceImpl(accountProvider);
        ReflectionTestUtils.setField(accountService, "authTokenDao", authTokenDao);

        JsonWebTokenUtil.setDefaultSecretKey(jwt);
    }

    @Test
    void testAuthGetTokenWithValidAccount() throws AuthenticationException {

        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        LoginDto loginDto = LoginDto.builder()
                .credential(password)
                .identifier(identifier)
                .build();

        when(accountProvider.loadAccount(identifier)).thenReturn(account);

        Map<String, String> response = accountService.authGetToken(loginDto);

        assertNotNull(response);
        assertNotNull(response.get("token"));
        assertNotNull(response.get("refreshToken"));
        assertNotNull(response.get("role"));
        assertEquals(JsonUtil.toJson(roles), response.get("role"));

    }

    @Test
    void testAuthGetTokenWithInvalidAccount() {

        String identifier = "user1";
        String password = "wrongPassword";
        LoginDto loginDto = LoginDto.builder()
                .credential(password)
                .identifier(identifier)
                .build();

        when(accountProvider.loadAccount(identifier)).thenReturn(null);

        Assertions.assertThrows(
                AuthenticationException.class,
                () -> accountService.authGetToken(loginDto)
        );
    }

    @Test
    void testRefreshTokenWithValidToken() throws Exception {

        String userId = "admin";
        String refreshToken = JsonWebTokenUtil.issueJwt(userId, 3600L, Collections.singletonMap("refresh", true));

        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(userId)).thenReturn(account);

        RefreshTokenResponse response = accountService.refreshToken(refreshToken);

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertNotNull(response.getRefreshToken());
        Claims accessClaims = JsonWebTokenUtil.parseJwt(response.getToken());
        Claims refreshClaims = JsonWebTokenUtil.parseJwt(response.getRefreshToken());
        assertNull(accessClaims.get("refresh", Boolean.class));
        assertEquals(Boolean.TRUE, refreshClaims.get("refresh", Boolean.class));
    }

    @Test
    void testRefreshTokenRejectsAccessToken() {
        String userId = "admin";
        String accessToken = JsonWebTokenUtil.issueJwt(userId, 3600L, roles);

        Assertions.assertThrows(
                AuthenticationException.class,
                () -> accountService.refreshToken(accessToken)
        );
    }

    @Test
    void testRefreshTokenRejectsDisabledAccount() {
        String userId = "admin";
        String refreshToken = JsonWebTokenUtil.issueJwt(userId, 3600L, Collections.singletonMap("refresh", true));
        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.TRUE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(userId)).thenReturn(account);

        Assertions.assertThrows(
                AuthenticationException.class,
                () -> accountService.refreshToken(refreshToken)
        );
    }

    @Test
    void testGenerateTokenCannotRefresh() throws Exception {
        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            String token = accountService.generateToken(null, null);

            assertNull(JsonWebTokenUtil.parseJwt(token).get("refresh", Boolean.class));
            Assertions.assertThrows(
                    AuthenticationException.class,
                    () -> accountService.refreshToken(token)
            );
        }
    }

    @Test
    void testGenerateTokenRejectsDisabledAccount() {
        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.TRUE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            Assertions.assertThrows(
                    AuthenticationException.class,
                    () -> accountService.generateToken(null, null)
            );
        }
    }

    @Test
    void testRefreshTokenWithInvalidToken() {

        String refreshToken = "invalidToken";

        Assertions.assertThrows(
                MalformedJwtException.class,
                () -> accountService.refreshToken(refreshToken)
        );
    }

    // ==================== Token Management Tests ====================

    @Test
    void testGenerateTokenPersistsToDb() throws Exception {
        SurenessAccount account = buildActiveAccount();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            String token = accountService.generateToken("My Token", null);

            assertNotNull(token);
            ArgumentCaptor<AuthToken> captor = ArgumentCaptor.forClass(AuthToken.class);
            verify(authTokenDao).save(captor.capture());
            AuthToken saved = captor.getValue();
            assertEquals("My Token", saved.getName());
            assertNotNull(saved.getTokenHash());
            assertNotNull(saved.getTokenMask());
            assertEquals((byte) 0, saved.getStatus());
            assertEquals(identifier, saved.getCreator());
            assertNull(saved.getExpireTime());
        }
    }

    @Test
    void testGenerateTokenNullName() throws Exception {
        SurenessAccount account = buildActiveAccount();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            accountService.generateToken(null, null);

            ArgumentCaptor<AuthToken> captor = ArgumentCaptor.forClass(AuthToken.class);
            verify(authTokenDao).save(captor.capture());
            assertNull(captor.getValue().getName());
        }
    }

    @Test
    void testGenerateTokenWithExpiration() throws Exception {
        SurenessAccount account = buildActiveAccount();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            LocalDateTime before = LocalDateTime.now();
            accountService.generateToken("Expiring Token", 7200L);

            ArgumentCaptor<AuthToken> captor = ArgumentCaptor.forClass(AuthToken.class);
            verify(authTokenDao).save(captor.capture());
            AuthToken saved = captor.getValue();
            assertNotNull(saved.getExpireTime());
            assertTrue(saved.getExpireTime().isAfter(before.plusSeconds(7100)));
        }
    }

    @Test
    void testGenerateTokenHasManagedClaim() throws Exception {
        SurenessAccount account = buildActiveAccount();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            String token = accountService.generateToken("test", null);

            Claims claims = JsonWebTokenUtil.parseJwt(token);
            assertEquals(Boolean.TRUE, claims.get(AccountServiceImpl.CLAIM_MANAGED, Boolean.class));
        }
    }

    @Test
    void testListTokensForAdmin() {
        List<AuthToken> expected = List.of(
                AuthToken.builder().id(1L).name("Token1").build(),
                AuthToken.builder().id(2L).name("Token2").build()
        );
        when(authTokenDao.findByStatus((byte) 0)).thenReturn(expected);
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            List<AuthToken> result = accountService.listTokens();

            assertEquals(2, result.size());
            assertEquals("Token1", result.get(0).getName());
        }
    }

    @Test
    void testListTokensForCurrentUser() {
        List<AuthToken> expected = List.of(
                AuthToken.builder().id(1L).name("Token1").creator("tom").build()
        );
        when(authTokenDao.findByStatusAndCreator((byte) 0, "tom")).thenReturn(expected);
        SubjectSum subjectSum = mockUserSubject("tom");

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            List<AuthToken> result = accountService.listTokens();

            assertEquals(1, result.size());
            assertEquals("Token1", result.get(0).getName());
            verify(authTokenDao).findByStatusAndCreator((byte) 0, "tom");
        }
    }

    @Test
    void testDeleteTokenInvalidatesCache() throws Exception {
        AuthToken token = AuthToken.builder().id(1L).tokenHash("hash123").creator(identifier).build();
        when(authTokenDao.findById(1L)).thenReturn(Optional.of(token));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            accountService.deleteToken(1L);
        }

        verify(authTokenDao).deleteById(1L);
    }

    @Test
    void testDeleteTokenRejectsNonOwner() {
        AuthToken token = AuthToken.builder().id(1L).tokenHash("hash123").creator("admin").build();
        when(authTokenDao.findById(1L)).thenReturn(Optional.of(token));
        SubjectSum subjectSum = mockUserSubject("tom");

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            Assertions.assertThrows(AuthenticationException.class, () -> accountService.deleteToken(1L));
        }
    }

    @Test
    void testCheckTokenStatusActive() throws Exception {
        SurenessAccount account = buildActiveAccount();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum subjectSum = mockAdminSubject(identifier);

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            String token = accountService.generateToken("test", null);
            when(authTokenDao.existsByTokenHashAndStatus(any(String.class), eq((byte) 0))).thenReturn(true);

            String result = accountService.checkTokenStatus(token);

            assertNull(result);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"revoked-token", "nonexistent-token"})
    void testCheckTokenStatusRejectsRevokedOrMissingToken(String token) {
        when(authTokenDao.existsByTokenHashAndStatus(any(String.class), eq((byte) 0))).thenReturn(false);

        String result = accountService.checkTokenStatus(token);

        assertEquals("Token has been revoked", result);
    }

    @Test
    void testCheckTokenStatusReflectsCurrentStoredStatus() {
        String token = "changing-status-token";
        when(authTokenDao.existsByTokenHashAndStatus(CryptoUtils.sha256Hex(token), (byte) 0))
                .thenReturn(true, false, true);

        assertNull(accountService.checkTokenStatus(token));
        assertEquals("Token has been revoked", accountService.checkTokenStatus(token));
        assertNull(accountService.checkTokenStatus(token));
    }

    @Test
    void testCheckTokenStatusPropagatesStorageFailure() {
        String token = "unavailable-status-token";
        when(authTokenDao.existsByTokenHashAndStatus(CryptoUtils.sha256Hex(token), (byte) 0))
                .thenReturn(true).thenThrow(new IllegalStateException("storage unavailable"));

        assertNull(accountService.checkTokenStatus(token));
        Assertions.assertThrows(IllegalStateException.class, () -> accountService.checkTokenStatus(token));
    }

    @Test
    void testCheckManagedTokenAccessValid() {
        when(accountProvider.loadAccount(identifier)).thenReturn(buildActiveAccount());

        String result = accountService.checkManagedTokenAccess(identifier, List.of("admin"));

        assertNull(result);
    }

    @Test
    void testCheckManagedTokenAccessRejectsDisabledAccount() {
        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.TRUE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);

        String result = accountService.checkManagedTokenAccess(identifier, List.of("admin"));

        assertEquals("Token owner account is no longer valid", result);
    }

    @Test
    void testCheckManagedTokenAccessRejectsOutdatedRoles() {
        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(List.of("guest"))
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);

        String result = accountService.checkManagedTokenAccess(identifier, List.of("admin"));

        assertEquals("Token permissions are outdated", result);
    }

    @Test
    void testTouchTokenLastUsedTime() {
        accountService.touchTokenLastUsedTime("some-token-value");

        verify(authTokenDao).updateLastUsedTime(any(String.class), any(LocalDateTime.class));
    }

    @Test
    void testTouchTokenLastUsedTimeThrottled() {
        // First call - should write to DB
        accountService.touchTokenLastUsedTime("throttle-token");
        // Second call within 5 minutes - should be throttled
        accountService.touchTokenLastUsedTime("throttle-token");

        verify(authTokenDao, times(1)).updateLastUsedTime(any(String.class), any(LocalDateTime.class));
    }

    @Test
    void testTouchTokenLastUsedTimeDifferentTokensNotThrottled() {
        accountService.touchTokenLastUsedTime("token-a");
        accountService.touchTokenLastUsedTime("token-b");

        verify(authTokenDao, times(2)).updateLastUsedTime(any(String.class), any(LocalDateTime.class));
    }

    @Test
    void testDeleteTokenRejectsPreviouslyAcceptedToken() throws Exception {
        String tokenValue = "token-to-revoke";
        String tokenHash = CryptoUtils.sha256Hex(tokenValue);
        AtomicBoolean active = new AtomicBoolean(true);
        when(authTokenDao.existsByTokenHashAndStatus(tokenHash, (byte) 0)).thenAnswer(ignored -> active.get());
        AuthToken token = AuthToken.builder().id(1L).tokenHash(tokenHash).creator(identifier).build();
        when(authTokenDao.findById(1L)).thenReturn(Optional.of(token));
        doAnswer(ignored -> {
            active.set(false);
            return null;
        }).when(authTokenDao).deleteById(1L);
        assertNull(accountService.checkTokenStatus(tokenValue));

        SubjectSum subject = mockAdminSubject(identifier);
        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(subject);
            accountService.deleteToken(1L);
        }

        assertEquals("Token has been revoked", accountService.checkTokenStatus(tokenValue));
        verify(authTokenDao).deleteById(1L);
    }

    @Test
    void testConcurrentStatusCheckCannotRemainAcceptedAfterDeletion() throws Exception {
        String tokenValue = "concurrently-revoked-token";
        String tokenHash = CryptoUtils.sha256Hex(tokenValue);
        AtomicBoolean active = new AtomicBoolean(true);
        CountDownLatch deletionEntered = new CountDownLatch(1);
        CountDownLatch allowDeletion = new CountDownLatch(1);
        when(authTokenDao.existsByTokenHashAndStatus(tokenHash, (byte) 0)).thenAnswer(ignored -> active.get());
        AuthToken token = AuthToken.builder().id(1L).tokenHash(tokenHash).creator(identifier).build();
        when(authTokenDao.findById(1L)).thenReturn(Optional.of(token));
        doAnswer(ignored -> {
            deletionEntered.countDown();
            assertTrue(allowDeletion.await(5, TimeUnit.SECONDS), "Status check did not release deletion");
            active.set(false);
            return null;
        }).when(authTokenDao).deleteById(1L);
        SubjectSum subject = mockAdminSubject(identifier);
        assertNull(accountService.checkTokenStatus(tokenValue));

        try (var executor = Executors.newSingleThreadExecutor()) {
            var deletion = executor.submit(() -> {
                SurenessContextHolder.bindSubject(subject);
                try {
                    accountService.deleteToken(1L);
                } finally {
                    SurenessContextHolder.clear();
                }
                return null;
            });
            try {
                assertTrue(deletionEntered.await(5, TimeUnit.SECONDS), "Deletion did not reach the DAO");
                // This read is allowed while deletion has not completed, but must not keep later reads active.
                assertNull(accountService.checkTokenStatus(tokenValue));
            } finally {
                allowDeletion.countDown();
            }
            deletion.get(5, TimeUnit.SECONDS);
        }

        assertEquals("Token has been revoked", accountService.checkTokenStatus(tokenValue));
    }

    @ParameterizedTest
    @ValueSource(strings = {"user", "guest", "operator", "administrator"})
    void nonAdminCannotLoginRefreshOrGenerateManagementToken(String role) throws Exception {
        SurenessAccount account = DefaultAccount.builder(identifier).setPassword(password)
                .setOwnRoles(List.of(role)).setDisabledAccount(false).setExcessiveAttempts(false).build();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        LoginDto login = LoginDto.builder().identifier(identifier).credential(password).build();
        Assertions.assertThrows(AuthenticationException.class, () -> accountService.authGetToken(login));
        String refresh = JsonWebTokenUtil.issueJwt(identifier, 3600L, Map.of("refresh", true));
        Assertions.assertThrows(AuthenticationException.class, () -> accountService.refreshToken(refresh));
        SubjectSum nonAdmin = mockUserSubject(identifier);
        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(nonAdmin);
            Assertions.assertThrows(AuthenticationException.class, () -> accountService.generateToken("legacy", null));
        }
        org.mockito.Mockito.verifyNoInteractions(authTokenDao);
        assertEquals(List.of(role), account.getOwnRoles());
    }

    @Test
    void migratedAdminIssuesOnlyAdminAndDoesNotRewriteAccountRoles() throws Exception {
        SurenessAccount account = DefaultAccount.builder(identifier).setPassword(password)
                .setOwnRoles(List.of("admin", "user", "custom")).setDisabledAccount(false).setExcessiveAttempts(false).build();
        when(accountProvider.loadAccount(identifier)).thenReturn(account);
        Map<String, String> login = accountService.authGetToken(
                LoginDto.builder().identifier(identifier).credential(password).build());
        assertEquals("[\"admin\"]", login.get("role"));
        assertEquals(List.of("admin"), JsonWebTokenUtil.parseJwt(login.get("token")).get("roles"));
        RefreshTokenResponse refreshed = accountService.refreshToken(login.get("refreshToken"));
        assertEquals(List.of("admin"), JsonWebTokenUtil.parseJwt(refreshed.getToken()).get("roles"));
        when(authTokenDao.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubjectSum admin = mockAdminSubject(identifier);
        try (var context = mockStatic(SurenessContextHolder.class)) {
            context.when(SurenessContextHolder::getBindSubject).thenReturn(admin);
            assertEquals(List.of("admin"), JsonWebTokenUtil.parseJwt(accountService.generateToken("reviewed", 3600L)).get("roles"));
        }
        assertEquals(List.of("admin", "user", "custom"), account.getOwnRoles());
    }

    private SurenessAccount buildActiveAccount() {
        return DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
    }

    private SubjectSum mockAdminSubject(String principal) {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(principal);
        when(subjectSum.hasRole("admin")).thenReturn(true);
        return subjectSum;
    }

    private SubjectSum mockUserSubject(String principal) {
        SubjectSum subjectSum = mock(SubjectSum.class);
        when(subjectSum.getPrincipal()).thenReturn(principal);
        when(subjectSum.hasRole("admin")).thenReturn(false);
        return subjectSum;
    }
}
