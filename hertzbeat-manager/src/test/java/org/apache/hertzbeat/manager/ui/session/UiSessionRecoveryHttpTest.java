/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.ui.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.util.JsonWebTokenUtil;
import jakarta.servlet.http.Cookie;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.apache.hertzbeat.manager.setup.identity.AccountCredentialVerifier;
import org.apache.hertzbeat.manager.setup.identity.IdentityPasswordPolicy;
import org.apache.hertzbeat.manager.setup.identity.VersionedAccount;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Isolated;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@Isolated("Uses ephemeral test-JVM JWT signing material only")
class UiSessionRecoveryHttpTest {
    private static final String USER = "synthetic-recovery-user";
    private VersionedAccount account;
    private MockMvc mvc;
    private Object previousKey;
    private Object previousDefault;

    @BeforeEach
    void setUp() {
        previousKey = ReflectionTestUtils.getField(JsonWebTokenUtil.class, "secretKey");
        previousDefault = ReflectionTestUtils.getField(JsonWebTokenUtil.class, "isUsedDefault");
        randomSigningKey();
        account = mock(VersionedAccount.class);
        when(account.getAppId()).thenReturn(USER);
        when(account.getOwnRoles()).thenReturn(List.of("admin"));
        when(account.credentialVersion()).thenReturn(7L);
        var accounts = new AccountServiceImpl(username -> USER.equals(username) ? account : null,
                mock(AuthTokenDao.class), new AccountCredentialVerifier(new IdentityPasswordPolicy()));
        var service = new UiSessionService(accounts);
        var cookies = new UiSessionCookieManager();
        mvc = MockMvcBuilders.standaloneSetup(new UiSessionController(service, cookies))
                .addFilters(new UiSessionCookieAuthenticationFilter(cookies, service)).build();
    }

    @AfterEach
    void restoreSigningState() {
        ReflectionTestUtils.setField(JsonWebTokenUtil.class, "secretKey", previousKey);
        ReflectionTestUtils.setField(JsonWebTokenUtil.class, "isUsedDefault", previousDefault);
    }

    @Test
    void naturalAccessExpiryPreservesRefreshAndRefreshStillAuthenticatesTheAccount() throws Exception {
        String access = access(-3600L);
        String refresh = refresh(3600L);
        var response = mvc.perform(get("/api/ui/session").cookie(
                        new Cookie(UiSessionCookieManager.ACCESS_COOKIE, access),
                        new Cookie(UiSessionCookieManager.REFRESH_COOKIE, refresh)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.authenticated").value(false))
                .andReturn().getResponse();
        assertThat(response.getHeaders("Set-Cookie")).hasSize(1).allSatisfy(value -> assertThat(value)
                .startsWith(UiSessionCookieManager.ACCESS_COOKIE + "=").contains("Max-Age=0"));
        assertRefreshAccepted(refresh);
    }

    @Test
    void missingAccessDoesNotEraseRefresh() throws Exception {
        String refresh = refresh(3600L);
        var response = mvc.perform(get("/api/ui/session")
                        .cookie(new Cookie(UiSessionCookieManager.REFRESH_COOKIE, refresh)))
                .andExpect(jsonPath("$.data.authenticated").value(false)).andReturn().getResponse();
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        assertRefreshAccepted(refresh);
    }

    @Test
    void invalidSignatureClearsBothCookiesEvenWhenTokenAlsoExpired() throws Exception {
        Object key = ReflectionTestUtils.getField(JsonWebTokenUtil.class, "secretKey");
        randomSigningKey();
        String invalid = access(-3600L);
        ReflectionTestUtils.setField(JsonWebTokenUtil.class, "secretKey", key);
        assertAccessClearsBoth(invalid);
    }

    @Test
    void expiredAccessWithChangedCredentialVersionClearsBothAndRejectsRefresh() throws Exception {
        String access = access(-3600L);
        String refresh = refresh(3600L);
        when(account.credentialVersion()).thenReturn(8L);
        assertAccessClearsBoth(access);
        assertRefreshRejected(refresh);
    }

    @Test
    void expiredAccessWithChangedRolesClearsBoth() throws Exception {
        String access = access(-3600L);
        when(account.getOwnRoles()).thenReturn(List.of("user"));
        assertAccessClearsBoth(access);
    }

    @Test
    void expiredRefreshCannotRecover() throws Exception {
        assertRefreshRejected(refresh(-3600L));
    }

    @Test
    void disabledAccountCannotRecoverUsingValidRefresh() throws Exception {
        String refresh = refresh(3600L);
        when(account.isDisabledAccount()).thenReturn(true);
        assertRefreshRejected(refresh);
    }

    @Test
    void invalidRefreshSignatureCannotRecover() throws Exception {
        Object key = ReflectionTestUtils.getField(JsonWebTokenUtil.class, "secretKey");
        randomSigningKey();
        String invalid = refresh(3600L);
        ReflectionTestUtils.setField(JsonWebTokenUtil.class, "secretKey", key);
        assertRefreshRejected(invalid);
    }

    @Test
    void accessTokenAndMissingCookieCannotBeUsedAsRefresh() throws Exception {
        assertRefreshRejected(access(3600L));
        assertRefreshRejected(null);
    }

    private void assertAccessClearsBoth(String access) throws Exception {
        var response = mvc.perform(get("/api/ui/session")
                        .cookie(new Cookie(UiSessionCookieManager.ACCESS_COOKIE, access)))
                .andExpect(jsonPath("$.data.authenticated").value(false)).andReturn().getResponse();
        assertThat(response.getHeaders("Set-Cookie")).hasSize(2)
                .allSatisfy(value -> assertThat(value).contains("Max-Age=0"));
    }

    private void assertRefreshAccepted(String refresh) throws Exception {
        var response = mvc.perform(post("/api/ui/session/refresh").header("Sec-Fetch-Site", "same-origin")
                        .cookie(new Cookie(UiSessionCookieManager.REFRESH_COOKIE, refresh)))
                .andExpect(jsonPath("$.code").value(0)).andExpect(jsonPath("$.data.authenticated").value(true))
                .andReturn().getResponse();
        assertThat(response.getHeaders("Set-Cookie")).hasSize(2).allSatisfy(value -> assertThat(value)
                .contains("Max-Age=", "Expires=", "HttpOnly", "SameSite=Strict").doesNotContain("Domain="));
    }

    private void assertRefreshRejected(String refresh) throws Exception {
        var request = post("/api/ui/session/refresh").header("Sec-Fetch-Site", "same-origin");
        if (refresh != null) {
            request.cookie(new Cookie(UiSessionCookieManager.REFRESH_COOKIE, refresh));
        }
        var response = mvc.perform(request).andExpect(jsonPath("$.msg").value("ui_session_refresh_failed"))
                .andReturn().getResponse();
        assertThat(response.getHeaders("Set-Cookie")).hasSize(2)
                .allSatisfy(value -> assertThat(value).contains("Max-Age=0"));
    }

    private static String access(long seconds) {
        return JsonWebTokenUtil.issueJwt(USER, seconds, List.of("admin"), new HashMap<>(Map.of(
                AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.UI_SESSION, "credentialVersion", 7L)));
    }

    private static String refresh(long seconds) {
        return JsonWebTokenUtil.issueJwt(USER, seconds, Map.of("refresh", true, "credentialVersion", 7L));
    }

    private static void randomSigningKey() {
        byte[] material = new byte[64];
        new SecureRandom().nextBytes(material);
        try {
            JsonWebTokenUtil.setDefaultSecretKey(Base64.getEncoder().encodeToString(material));
        } finally {
            Arrays.fill(material, (byte) 0);
        }
    }
}
