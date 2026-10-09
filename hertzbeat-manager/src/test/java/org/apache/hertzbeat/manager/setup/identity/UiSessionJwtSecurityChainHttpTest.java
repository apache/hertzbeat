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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.configuration.SurenessAutoConfiguration;
import com.usthe.sureness.configuration.SurenessProperties;
import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.matcher.TreePathRoleMatcher;
import com.usthe.sureness.mgt.SurenessSecurityManager;
import com.usthe.sureness.processor.DefaultProcessorManager;
import com.usthe.sureness.processor.Processor;
import com.usthe.sureness.processor.ProcessorManager;
import com.usthe.sureness.provider.ducument.DocumentResourceAccess;
import com.usthe.sureness.subject.SubjectFactory;
import com.usthe.sureness.subject.support.JwtSubject;
import com.usthe.sureness.subject.support.NoneSubject;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.SurenessContextHolder;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.util.CryptoUtils;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.config.ApiTokenValidationConfiguration;
import org.apache.hertzbeat.manager.config.ApiTokenValidationFilter;
import org.apache.hertzbeat.manager.config.SurenessSpring7CompatibilityConfiguration;
import org.apache.hertzbeat.manager.config.SurenessSpring7ServletFilter;
import org.apache.hertzbeat.manager.controller.SignalSavedViewController;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.service.AccountService;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.apache.hertzbeat.manager.ui.session.UiSessionCookieManager;
import org.apache.hertzbeat.manager.ui.session.UiSessionSecurityConfiguration;
import org.apache.hertzbeat.manager.ui.session.UiSessionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.api.parallel.Isolated;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/**
 * Assembled HTTP expiry proof with ephemeral signing material and production JWT processors.
 * Run in a dedicated Surefire fork; isolation and teardown also protect full-suite execution.
 */
@Isolated("Mutates only test-JVM Sureness/JWT globals; never uses runtime service credentials")
@Execution(ExecutionMode.SAME_THREAD)
class UiSessionJwtSecurityChainHttpTest {
    private static final String USER = "synthetic-cookie-user";
    private static final String ACCESS_COOKIE = "hertzbeat_ui_access";
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private SubjectFactory previousFactory;
    private ProcessorManager previousProcessors;
    private TreePathRoleMatcher previousMatcher;
    private Object previousKey;
    private Object previousDefaultFlag;
    private boolean snapshotCaptured;

    @BeforeEach
    void setUp() {
        // Snapshot opaque test-JVM references only; never encode, log or reuse the previous key.
        previousKey = ReflectionTestUtils.getField(JsonWebTokenUtil.class, "secretKey");
        previousDefaultFlag = ReflectionTestUtils.getField(JsonWebTokenUtil.class, "isUsedDefault");
        var manager = SurenessSecurityManager.getInstance();
        previousFactory = manager.getSubjectFactory();
        previousProcessors = manager.getProcessorManager();
        previousMatcher = manager.getPathRoleMatcher();
        snapshotCaptured = true;
        byte[] material = new byte[64];
        new SecureRandom().nextBytes(material);
        try {
            JsonWebTokenUtil.setDefaultSecretKey(Base64.getEncoder().encodeToString(material));
        } finally {
            Arrays.fill(material, (byte) 0);
        }
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(TestConfiguration.class, SurenessAutoConfiguration.class);
        context.refresh();
        var registrations = context.getBeansOfType(FilterRegistrationBean.class).values().stream()
                .sorted(Comparator.comparingInt(FilterRegistrationBean::getOrder)).toList();
        assertThat(registrations).hasSize(2);
        assertThat(registrations.get(0).getFilterName()).isEqualTo("UiSessionCookieAuthenticationFilter");
        assertThat(registrations.get(1).getFilter()).isInstanceOf(SurenessSpring7ServletFilter.class);
        assertThat(context.getBean(ProcessorManager.class)).isSameAs(context.getBean("databaseIdentityProcessorManager"));
        assertThat(jwtProcessor()).isInstanceOf(VersionedJwtProcessor.class);
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(registrations.stream().map(FilterRegistrationBean::getFilter).toArray(Filter[]::new)).build();
    }

    @AfterEach
    void tearDown() {
        if (!snapshotCaptured) {
            return;
        }
        try {
            if (context != null) {
                context.close();
            }
        } finally {
            var manager = SurenessSecurityManager.getInstance();
            manager.setSubjectFactory(previousFactory);
            manager.setProcessorManager(previousProcessors);
            manager.setPathRoleMatcher(previousMatcher);
            ReflectionTestUtils.setField(JsonWebTokenUtil.class, "secretKey", previousKey);
            ReflectionTestUtils.setField(JsonWebTokenUtil.class, "isUsedDefault", previousDefaultFlag);
            SurenessContextHolder.clear();
            AuthTokenRequestContext.clear();
            assertThat(manager.getSubjectFactory()).isSameAs(previousFactory);
            assertThat(manager.getProcessorManager()).isSameAs(previousProcessors);
            assertThat(manager.getPathRoleMatcher()).isSameAs(previousMatcher);
            assertThat(ReflectionTestUtils.getField(JsonWebTokenUtil.class, "secretKey")).isSameAs(previousKey);
            assertThat(ReflectionTestUtils.getField(JsonWebTokenUtil.class, "isUsedDefault")).isEqualTo(previousDefaultFlag);
        }
    }

    @Test
    void expiredCookieRejectsAccessButPreservesRefreshForCurrentIdentity() throws Exception {
        String expired = token(-60L);
        var response = mvc.perform(get("/api/signal/saved-view/logs").cookie(new Cookie(ACCESS_COOKIE, expired)))
                .andExpect(status().isUnauthorized()).andReturn().getResponse();
        var cookies = response.getHeaders("Set-Cookie");
        assertThat(cookies).hasSize(1);
        assertThat(cookies).anySatisfy(cookie -> assertThat(cookie)
                .startsWith(ACCESS_COOKIE + "=").contains("Path=/api;"));
        assertThat(cookies).allSatisfy(cookie -> assertThat(cookie)
                .contains("Max-Age=0", "HttpOnly", "SameSite=Strict").doesNotContain(expired));
        verify(context.getBean(UiSessionService.class)).inspect(expired);
        verify(jwtProcessor()).canSupportSubjectClass(NoneSubject.class);
        verify(jwtProcessor(), never()).authenticated(any());
        verify(context.getBean(AccountService.class)).checkSessionAccess(USER, List.of("user"), 1L);
        verify(context.getBean(DatabaseAccountRepository.class)).findByUsername(USER);
        assertDeniedDownstream();
    }

    @Test
    void validCookieReachesProductionJwtProcessorAndControllerWithoutCookieClearing() throws Exception {
        String valid = token(3600L);
        when(context.getBean(SignalSavedViewService.class).listSignalSavedViews(USER, "logs"))
                .thenAnswer(invocation -> {
                    assertThat(SurenessContextHolder.getBindSubject().getPrincipal()).isEqualTo(USER);
                    assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isEqualTo("default");
                    return List.of();
                });
        var response = mvc.perform(get("/api/signal/saved-view/logs").cookie(new Cookie(ACCESS_COOKIE, valid)))
                .andExpect(status().isOk()).andReturn().getResponse();
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        verify(context.getBean(UiSessionService.class)).inspect(valid);
        verify(jwtProcessor()).authenticated(any(JwtSubject.class));
        verify(context.getBean(AccountService.class)).checkSessionAccess(USER, List.of("user"), 1L);
        // Inspection and production JWT credential validation each use the real provider.
        verify(context.getBean(DatabaseAccountRepository.class), times(2)).findByUsername(USER);
        verify(context.getBean(SignalSavedViewService.class)).listSignalSavedViews(USER, "logs");
        verify(context.getBean(ApiTokenValidationFilter.class)).preHandle(any(), any(), any());
        assertContextsCleared();
    }

    @Test
    void expiredBearerReachesProductionJwtProcessorAndRejectsBeforeController() throws Exception {
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token(-60L)))
                .andExpect(status().isUnauthorized());
        verify(jwtProcessor()).authenticated(any(JwtSubject.class));
        verifyNoInteractions(context.getBean(UiSessionService.class), context.getBean(AccountService.class),
                context.getBean(DatabaseAccountRepository.class));
        assertDeniedDownstream();
    }

    @Test
    void activeManagedTokenPassesRealStatusAndRoleChecksAndReachesController() throws Exception {
        String active = managedToken(3600L);
        mockActiveStorage(active);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + active))
                .andExpect(status().isOk());
        verify(context.getBean(AccountService.class)).checkTokenStatus(active, AuthTokenScopes.READONLY_QUERY, "default");
        verify(context.getBean(AccountService.class)).checkManagedTokenAccess(USER, List.of("user"), 1L);
        verify(context.getBean(AuthTokenDao.class)).updateLastUsedTime(org.mockito.ArgumentMatchers.eq(CryptoUtils.sha256Hex(active)), any());
        verify(context.getBean(SignalSavedViewService.class)).listSignalSavedViews(USER, "logs");
        assertContextsCleared();
    }

    @Test
    void revokedManagedTokenStopsBeforeControllerAndClearsRequestContext() throws Exception {
        String revoked = managedToken(3600L);
        // Mock storage has no active row. Real status/cache code determines the rejection.
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + revoked))
                .andExpect(status().isUnauthorized());
        verify(context.getBean(AccountService.class)).checkTokenStatus(revoked, AuthTokenScopes.READONLY_QUERY, "default");
        verify(context.getBean(AccountService.class), never()).checkManagedTokenAccess(any(), any(), any());
        assertManagedRejection();
    }

    @Test
    void expiredManagedTokenStopsInJwtAuthenticationWithoutStorageOrControllerCalls() throws Exception {
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + managedToken(-60L)))
                .andExpect(status().isUnauthorized());
        verify(jwtProcessor()).authenticated(any(JwtSubject.class));
        verifyNoInteractions(context.getBean(AuthTokenDao.class), context.getBean(AccountService.class));
        assertDeniedDownstream();
    }

    @Test
    void managedTokenWithOutdatedClaimedRoleStopsBeforeControllerAndClearsRequestContext() throws Exception {
        String token = managedToken(3600L);
        mockActiveStorage(token);
        when(context.getBean(DatabaseAccountRepository.class).findByUsername(USER))
                .thenReturn(Optional.of(DatabaseAccount.ordinary(USER, "unused-fixture-hash", "guest")));
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verify(context.getBean(AccountService.class)).checkManagedTokenAccess(USER, List.of("user"), 1L);
        assertManagedRejection();
    }

    @Test
    void rejectedThenAcceptedRequestOnSameThreadDoesNotInheritWorkspace() throws Exception {
        Thread requestThread = Thread.currentThread();
        String rejected = managedToken(3600L, "rejected-workspace");
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + rejected))
                .andExpect(status().isUnauthorized());
        assertManagedRejection();

        String accepted = managedToken(3600L);
        mockActiveStorage(accepted);
        when(context.getBean(SignalSavedViewService.class).listSignalSavedViews(USER, "logs"))
                .thenAnswer(invocation -> {
                    assertThat(Thread.currentThread()).isSameAs(requestThread);
                    assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isEqualTo("default");
                    assertThat(AuthTokenRequestContext.currentWorkspaceId()).isEqualTo("default");
                    assertThat(AuthTokenRequestContext.currentCollectorId()).isNull();
                    return List.of();
                });
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + accepted))
                .andExpect(status().isOk());
        assertContextsCleared();
    }

    @Test
    void externalRevocationAndAlreadyRevokedAreObservedAfterPriorSuccessfulRequest() throws Exception {
        String token = managedToken(3600L);
        String hash = CryptoUtils.sha256Hex(token);
        AuthToken row = mockMutableStorage(token);
        AuthTokenDao storage = context.getBean(AuthTokenDao.class);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        row.setStatus((byte) 1);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        when(storage.findByIdForUpdate(1L)).thenReturn(Optional.of(row));
        when(context.getBean(SignalSavedViewService.class).listSignalSavedViews(USER, "logs"))
                .thenAnswer(invocation -> {
                    assertThat(context.getBean(AccountService.class).deleteToken(1L))
                            .isEqualTo(AccountService.TokenRevocationResult.ALREADY_REVOKED);
                    return List.of();
                });
        // An independent valid UI session may make an idempotent owner revocation call.
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token(3600L)))
                .andExpect(status().isOk());
        verify(storage, times(2)).existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(hash, (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default");
        verify(storage, never()).saveAndFlush(any());
        clearInvocations(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class),
                context.getBean(ApiTokenValidationFilter.class), context.getBean(AccountService.class), storage);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        assertManagedRejection();
        verify(storage).existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(hash, (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default");
        verify(storage, never()).saveAndFlush(any());
        assertContextsCleared();
    }

    @Test
    void storageFailureAfterSuccessfulRequestFailsClosed() throws Exception {
        String token = managedToken(3600L);
        mockActiveStorage(token);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        AuthTokenDao storage = context.getBean(AuthTokenDao.class);
        when(storage.existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                CryptoUtils.sha256Hex(token), (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default"))
                .thenThrow(new IllegalStateException("Synthetic status storage unavailable"));
        clearInvocations(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class),
                context.getBean(ApiTokenValidationFilter.class), context.getBean(AccountService.class), storage);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isServiceUnavailable());
        assertManagedRejection();
    }

    @Test
    void ownerRevocationIsObservedAfterPriorSuccessfulRequest() throws Exception {
        String token = managedToken(3600L);
        String hash = CryptoUtils.sha256Hex(token);
        AuthToken row = mockMutableStorage(token);
        AuthTokenDao storage = context.getBean(AuthTokenDao.class);
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        when(storage.findByIdForUpdate(1L)).thenReturn(Optional.of(row));
        when(storage.findById(1L)).thenReturn(Optional.of(row));
        when(context.getBean(SignalSavedViewService.class).listSignalSavedViews(USER, "logs"))
                .thenAnswer(invocation -> {
                    assertThat(context.getBean(AccountService.class).deleteToken(1L))
                            .isEqualTo(AccountService.TokenRevocationResult.REVOKED);
                    return List.of();
                });
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        verify(storage).saveAndFlush(row);
        clearInvocations(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class),
                context.getBean(ApiTokenValidationFilter.class));
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class));
        verify(storage, times(3)).existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(hash, (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default");
        assertContextsCleared();
    }

    private AuthToken mockMutableStorage(String token) {
        var row = AuthToken.builder().id(1L).tokenHash(CryptoUtils.sha256Hex(token)).creator(USER).status((byte) 0)
                .tokenScope(AuthTokenScopes.READONLY_QUERY).workspaceId("default").build();
        when(context.getBean(AuthTokenDao.class).existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                CryptoUtils.sha256Hex(token), (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default"))
                .thenAnswer(invocation -> row.getStatus() == 0);
        return row;
    }

    @Test
    void expiredManagedJwtRejectsBeforeActiveStorageCheck() throws Exception {
        String token = managedToken(-3600L);
        mockActiveStorage(token);
        var accounts = context.getBean(AccountService.class);
        // Storage status is active, but the HTTP chain must reject JWT expiry before checking it again.
        assertThat(accounts.checkTokenStatus(token, AuthTokenScopes.READONLY_QUERY, "default")).isNull();
        verify(context.getBean(AuthTokenDao.class)).existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                CryptoUtils.sha256Hex(token), (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default");
        assertThatThrownBy(() -> JsonWebTokenUtil.parseJwt(token)).isInstanceOf(ExpiredJwtException.class);
        clearInvocations(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class),
                context.getBean(ApiTokenValidationFilter.class), accounts, context.getBean(AuthTokenDao.class), jwtProcessor());
        mvc.perform(get("/api/signal/saved-view/logs").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verify(jwtProcessor()).authenticated(any(JwtSubject.class));
        verifyNoInteractions(accounts, context.getBean(AuthTokenDao.class));
        assertDeniedDownstream();
    }

    private void mockActiveStorage(String token) {
        when(context.getBean(AuthTokenDao.class).existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                CryptoUtils.sha256Hex(token), (byte) 0,
                AuthTokenScopes.allowedTokenScopesFor(AuthTokenScopes.READONLY_QUERY), "default"))
                .thenReturn(true);
    }

    private void assertManagedRejection() throws Exception {
        verifyNoInteractions(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class));
        verify(context.getBean(ApiTokenValidationFilter.class)).preHandle(any(), any(), any());
        // Spring does not call afterCompletion on an interceptor whose preHandle returns false.
        verify(context.getBean(ApiTokenValidationFilter.class), never()).afterCompletion(any(), any(), any(), any());
        verify(context.getBean(AccountService.class), never()).touchTokenLastUsedTime(any());
        verify(context.getBean(AuthTokenDao.class), never()).updateLastUsedTime(any(), any());
        assertContextsCleared();
    }

    private String managedToken(long lifetime) {
        return managedToken(lifetime, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
    }

    private String managedToken(long lifetime, String workspace) {
        return JsonWebTokenUtil.issueJwt(USER, lifetime, List.of("user"), new HashMap<>(Map.of(
                "managed", true,
                AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.READONLY_QUERY,
                AuthTokenScopes.CLAIM_WORKSPACE_ID, workspace,
                "credentialVersion", 1L)));
    }

    private String token(long lifetime) {
        return JsonWebTokenUtil.issueJwt(USER, lifetime, List.of("user"), new HashMap<>(Map.of(
                AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.UI_SESSION,
                AuthTokenScopes.CLAIM_WORKSPACE_ID, AuthTokenScopes.DEFAULT_WORKSPACE_ID,
                "credentialVersion", 1L)));
    }

    @SuppressWarnings("unchecked")
    private VersionedJwtProcessor jwtProcessor() {
        var processors = (List<Processor>) ReflectionTestUtils.getField(context.getBean(ProcessorManager.class), "processorList");
        return processors.stream().filter(VersionedJwtProcessor.class::isInstance)
                .map(VersionedJwtProcessor.class::cast).findFirst().orElseThrow();
    }

    private void assertDeniedDownstream() {
        verifyNoInteractions(context.getBean(SignalSavedViewController.class), context.getBean(SignalSavedViewService.class),
                context.getBean(ApiTokenValidationFilter.class));
        assertContextsCleared();
    }

    private void assertContextsCleared() {
        assertThat(SurenessContextHolder.getBindSubject()).isNull();
        assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isNull();
        assertThat(AuthTokenRequestContext.currentWorkspaceId()).isNull();
        assertThat(AuthTokenRequestContext.currentCollectorId()).isNull();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({DatabaseIdentityProcessorConfiguration.class, SurenessSpring7CompatibilityConfiguration.class,
            UiSessionSecurityConfiguration.class, ApiTokenValidationConfiguration.class})
    static class TestConfiguration {
        @Bean
        SurenessProperties properties() {
            var properties = new SurenessProperties();
            properties.setContainer(SurenessProperties.ContainerType.Jakarta_Servlet);
            properties.setAuths(new SurenessProperties.AuthType[]{SurenessProperties.AuthType.JWT});
            return properties;
        }

        @Bean
        static BeanPostProcessor observeProductionJwtProcessor() {
            return new BeanPostProcessor() {
                @Override
                @SuppressWarnings("unchecked")
                public Object postProcessAfterInitialization(Object bean, String name) {
                    if ("databaseIdentityProcessorManager".equals(name) && bean instanceof DefaultProcessorManager) {
                        var processors = (List<Processor>) ReflectionTestUtils.getField(bean, "processorList");
                        ReflectionTestUtils.setField(bean, "processorList", processors.stream()
                                .map(processor -> processor instanceof VersionedJwtProcessor ? spy(processor) : processor).toList());
                    }
                    return bean;
                }
            };
        }

        @Bean
        PathTreeProvider policy() throws java.io.IOException {
            var policy = DocumentResourceAccess.loadConfig(Path.of("..", "hertzbeat-startup", "src", "main",
                    "resources", "sureness.yml").toAbsolutePath().toString());
            return new PathTreeProvider() {
                public Set<String> providePathData() { return Set.copyOf(policy.getResourceRole()); }

                public Set<String> provideExcludedResource() { return Set.copyOf(policy.getExcludedResource()); }
            };
        }

        @Bean
        DatabaseAccountRepository repository() {
            var repository = mock(DatabaseAccountRepository.class);
            when(repository.findByUsername(USER)).thenReturn(Optional.of(
                    DatabaseAccount.ordinary(USER, "unused-fixture-hash", "user")));
            return repository;
        }

        @Bean
        DatabaseFirstAccountProvider accounts(DatabaseAccountRepository repository) {
            return new DatabaseFirstAccountProvider(repository, mock(LegacyAccountSource.class));
        }

        @Bean
        AccountCredentialVerifier verifier() { return new AccountCredentialVerifier(new IdentityPasswordPolicy()); }

        @Bean
        AccountService accountService(DatabaseFirstAccountProvider accounts, AuthTokenDao tokens,
                                      AccountCredentialVerifier verifier) {
            return spy(new AccountServiceImpl(accounts, tokens, verifier));
        }

        @Bean
        AuthTokenDao tokenStorage() { return mock(AuthTokenDao.class); }

        @Bean
        UiSessionService sessions(AccountService service) { return spy(new UiSessionService(service)); }

        @Bean
        UiSessionCookieManager cookies() { return new UiSessionCookieManager(); }

        @Bean
        ApiTokenValidationFilter tokenValidation(AccountService service) { return spy(new ApiTokenValidationFilter(service)); }

        @Bean
        SignalSavedViewService savedViews() { return mock(SignalSavedViewService.class); }

        @Bean
        SignalSavedViewController controller(SignalSavedViewService service) { return spy(new SignalSavedViewController(service)); }
    }
}
