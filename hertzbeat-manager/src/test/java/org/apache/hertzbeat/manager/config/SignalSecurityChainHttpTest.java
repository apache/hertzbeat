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

package org.apache.hertzbeat.manager.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.configuration.SurenessAutoConfiguration;
import com.usthe.sureness.configuration.SurenessProperties;
import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.mgt.SurenessSecurityManager;
import com.usthe.sureness.processor.ProcessorManager;
import com.usthe.sureness.matcher.TreePathRoleMatcher;
import com.usthe.sureness.subject.SubjectFactory;
import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentResourceAccess;
import com.usthe.sureness.util.SurenessContextHolder;
import jakarta.servlet.Filter;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.controller.SignalSavedViewController;
import org.apache.hertzbeat.manager.service.AccountService;
import org.apache.hertzbeat.manager.service.SignalSavedViewService;
import org.apache.hertzbeat.manager.ui.session.UiSessionCookieManager;
import org.apache.hertzbeat.manager.ui.session.UiSessionSecurityConfiguration;
import org.apache.hertzbeat.manager.ui.session.UiSessionService;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.service.LogQueryService;
import org.apache.hertzbeat.observability.traces.controller.TraceQueryController;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.observability.investigation.service.LogInvestigationReadModelService;
import org.apache.hertzbeat.observability.investigation.service.TraceInvestigationReadModelService;
import org.apache.hertzbeat.observability.ingestion.controller.OtlpIngestionController;
import org.apache.hertzbeat.observability.ingestion.service.OtlpIngestionWorkspaceService;
import org.apache.hertzbeat.observability.ingestion.red.OtlpIngestionRedSummaryService;
import org.apache.hertzbeat.observability.metrics.service.CollectorScopedMetricsQueryService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.mockito.Answers;
import org.mockito.Mockito;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/**
 * HTTP role policy proof using starter-created Sureness authorization and real controllers.
 * Synthetic Basic accounts replace the identity store; this is not a JWT/cookie or database integration proof.
 */
@ResourceLock("SurenessSecurityManager")
class SignalSecurityChainHttpTest {
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private SubjectFactory previousFactory;
    private ProcessorManager previousProcessors;
    private TreePathRoleMatcher previousMatcher;

    @BeforeEach
    void setUp() {
        var manager = SurenessSecurityManager.getInstance();
        previousFactory = manager.getSubjectFactory();
        previousProcessors = manager.getProcessorManager();
        previousMatcher = manager.getPathRoleMatcher();
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(TestConfiguration.class, SurenessAutoConfiguration.class);
        context.refresh();
        var registrations = context.getBeansOfType(FilterRegistrationBean.class).values().stream()
                .sorted(Comparator.comparingInt(FilterRegistrationBean::getOrder)).toList();
        assertThat(registrations).hasSize(2);
        assertThat(registrations.get(0).getFilterName()).isEqualTo("UiSessionCookieAuthenticationFilter");
        assertThat(registrations.get(1).getFilter()).isInstanceOf(SurenessSpring7ServletFilter.class);
        assertThat(registrations.get(0).getOrder()).isEqualTo(Integer.MAX_VALUE - 1);
        assertThat(registrations.get(1).getOrder()).isEqualTo(Integer.MAX_VALUE);
        for (var registration : registrations) {
            assertThat(registration.isEnabled()).isTrue();
            assertThat(registration.getUrlPatterns()).containsExactly("/*");
            assertThat(registration.determineDispatcherTypes()).contains(jakarta.servlet.DispatcherType.REQUEST);
        }
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(registrations.stream().map(FilterRegistrationBean::getFilter).toArray(Filter[]::new))
                .build();
    }

    @AfterEach
    void tearDown() {
        if (context != null) {
            context.close();
        }
        var manager = SurenessSecurityManager.getInstance();
        manager.setSubjectFactory(previousFactory);
        manager.setProcessorManager(previousProcessors);
        manager.setPathRoleMatcher(previousMatcher);
        SurenessContextHolder.clear();
        AuthTokenRequestContext.clear();
    }

    static Stream<Arguments> roleMatrix() {
        return Stream.of("logs", "traces", "metrics", "saved-read", "saved-put", "saved-delete")
                .flatMap(endpoint -> Stream.of("anonymous", "guest", "user", "admin", "unrecognized")
                        .map(role -> Arguments.of(endpoint, role, expectedStatus(endpoint, role))));
    }

    // Policy: startup sureness.yml read routes admin/user/guest; saved-view PUT/DELETE admin/user.
    private static int expectedStatus(String endpoint, String role) {
        if (role.equals("anonymous")) {
            return 401;
        }
        if (role.equals("unrecognized") || (role.equals("guest")
                && (endpoint.equals("saved-put") || endpoint.equals("saved-delete")))) {
            return 403;
        }
        return 200;
    }

    @ParameterizedTest(name = "{0} / {1} -> HTTP {2}")
    @MethodSource("roleMatrix")
    void enforcesStartupRolePolicyBeforeControllers(String endpoint, String role, int expected) throws Exception {
        var request = request(endpoint);
        if (!role.equals("anonymous")) {
            request.header("Authorization", "Basic " + java.util.Base64.getEncoder().encodeToString(
                            ("synthetic-" + role + ":fixture-only").getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        }
        mvc.perform(request).andExpect(status().is(expected));
        Object[] controllers = {context.getBean(LogQueryController.class), context.getBean(TraceQueryController.class),
                context.getBean(OtlpIngestionController.class), context.getBean(SignalSavedViewController.class)};
        if (expected != 200) {
            verifyNoInteractions(controllers);
            verifyNoInteractions(context.getBean(LogQueryService.class), context.getBean(EntityTraceQueryService.class),
                    context.getBean(CollectorScopedMetricsQueryService.class), context.getBean(SignalSavedViewService.class),
                    context.getBean(ObservabilityQueryAdmissionService.class));
        } else {
            Object controller = switch (endpoint) {
                case "logs" -> controllers[0];
                case "traces" -> controllers[1];
                case "metrics" -> controllers[2];
                default -> controllers[3];
            };
            Object service = switch (endpoint) {
                case "logs" -> context.getBean(LogQueryService.class);
                case "traces" -> context.getBean(EntityTraceQueryService.class);
                case "metrics" -> context.getBean(CollectorScopedMetricsQueryService.class);
                default -> context.getBean(SignalSavedViewService.class);
            };
            assertThat(Mockito.mockingDetails(controller).getInvocations()).isNotEmpty();
            assertThat(Mockito.mockingDetails(service).getInvocations()).isNotEmpty();
        }
        verifyNoInteractions(context.getBean(AccountService.class), context.getBean(UiSessionService.class));
        assertThat(SurenessContextHolder.getBindSubject()).isNull();
        assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isNull();
    }

    @Test
    void registeredInterceptorRunsWithTrustedContextAndClearsItAfterCompletion() throws Exception {
        when(context.getBean(SignalSavedViewService.class).listSignalSavedViews("synthetic-user", "logs"))
                .thenAnswer(invocation -> {
                    assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isEqualTo("default");
                    assertThat(AuthTokenRequestContext.currentWorkspaceId()).isEqualTo("default");
                    assertThat(SurenessContextHolder.getBindSubject().getPrincipal()).isEqualTo("synthetic-user");
                    return List.of();
                });
        mvc.perform(request("saved-read").header("Authorization", "Basic "
                + java.util.Base64.getEncoder().encodeToString("synthetic-user:fixture-only"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8))))
                .andExpect(status().isOk());

        ApiTokenValidationFilter interceptor = context.getBean(ApiTokenValidationFilter.class);
        verify(interceptor).preHandle(any(), any(), any());
        verify(interceptor).afterCompletion(any(), any(), any(), isNull());
        verify(context.getBean(SignalSavedViewService.class)).listSignalSavedViews("synthetic-user", "logs");
        assertThat(AuthTokenRequestContext.currentAuthenticatedWorkspaceId()).isNull();
        assertThat(AuthTokenRequestContext.currentWorkspaceId()).isNull();
        assertThat(SurenessContextHolder.getBindSubject()).isNull();
    }

    private static MockHttpServletRequestBuilder request(String endpoint) {
        return switch (endpoint) {
            case "logs" -> get("/api/logs/list").param("start", "1000").param("end", "2000");
            case "traces" -> get("/api/traces/list").param("start", "1000").param("end", "2000");
            case "metrics" -> get("/api/ingestion/otlp/metrics/console").param("start", "1000")
                    .param("end", "2000").param("query", "up");
            case "saved-read" -> get("/api/signal/saved-view/logs");
            case "saved-put" -> put("/api/signal/saved-view").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"signal\":\"logs\",\"viewKey\":\"synthetic\",\"label\":\"Fixture\","
                            + "\"route\":\"/log/manage\",\"revision\":1}");
            case "saved-delete" -> delete("/api/signal/saved-view/logs/synthetic").param("revision", "1");
            default -> throw new IllegalArgumentException(endpoint);
        };
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SurenessSpring7CompatibilityConfiguration.class,
            UiSessionSecurityConfiguration.class, ApiTokenValidationConfiguration.class, SelfTelemetryProperties.class})
    static class TestConfiguration {

        @Bean
        SurenessProperties surenessProperties() {
            var properties = new SurenessProperties();
            properties.setContainer(SurenessProperties.ContainerType.Jakarta_Servlet);
            properties.setAuths(new SurenessProperties.AuthType[]{SurenessProperties.AuthType.BASIC});
            return properties;
        }


        @Bean
        PathTreeProvider startupPolicy() throws java.io.IOException {
            // Read the canonical startup resource, not manager's older test sureness.yml.
            var policy = DocumentResourceAccess.loadConfig(Path.of("..", "hertzbeat-startup", "src", "main",
                    "resources", "sureness.yml").toAbsolutePath().toString());
            return new PathTreeProvider() {
                public Set<String> providePathData() { return Set.copyOf(policy.getResourceRole()); }

                public Set<String> provideExcludedResource() { return Set.copyOf(policy.getExcludedResource()); }
            };
        }


        @Bean
        SurenessAccountProvider syntheticAccounts() {
            var provider = mock(SurenessAccountProvider.class);
            for (String role : List.of("guest", "user", "admin", "unrecognized")) {
                when(provider.loadAccount("synthetic-" + role)).thenReturn(DefaultAccount.builder("synthetic-" + role)
                        .setPassword("fixture-only").setOwnRoles(List.of(role)).build());
            }
            return provider;
        }


        @Bean UiSessionCookieManager cookies() { return new UiSessionCookieManager(); }

        @Bean UiSessionService sessions() { return mock(UiSessionService.class); }

        @Bean AccountService accounts() { return mock(AccountService.class); }

        @Bean ApiTokenValidationFilter tokenValidation(AccountService accounts) { return spy(new ApiTokenValidationFilter(accounts)); }

        @Bean SignalSavedViewService savedViews() { return mock(SignalSavedViewService.class); }

        @Bean SignalSavedViewController savedController(SignalSavedViewService service) {
            return spy(new SignalSavedViewController(service));
        }

        @Bean ObservabilityQueryAdmissionService admission() {
            return mock(ObservabilityQueryAdmissionService.class, invocation -> {
                if (invocation.getMethod().getName().equals("execute")) {
                    return ((Supplier<?>) invocation.getArgument(1)).get();
                }
                return Answers.RETURNS_DEFAULTS.answer(invocation);
            });
        }

        private static <T> T emptyPages(Class<T> type) {
            return mock(type, invocation -> Page.class.isAssignableFrom(invocation.getMethod().getReturnType())
                    ? Page.empty(org.springframework.data.domain.PageRequest.of(0, 20)) : Answers.RETURNS_DEFAULTS.answer(invocation));
        }

        @Bean LogQueryService logs() { return emptyPages(LogQueryService.class); }

        @Bean EntityTraceQueryService traces() { return emptyPages(EntityTraceQueryService.class); }

        @Bean CollectorScopedMetricsQueryService metrics() { return mock(CollectorScopedMetricsQueryService.class); }

        @Bean LogQueryController logController(LogQueryService service, ObservabilityQueryAdmissionService admission) {
            return spy(new LogQueryController(service, admission, mock(LogInvestigationReadModelService.class)));
        }

        @Bean TraceQueryController traceController(EntityTraceQueryService service, ObservabilityQueryAdmissionService admission) {
            return spy(new TraceQueryController(service, admission, mock(TraceInvestigationReadModelService.class)));
        }

        @Bean OtlpIngestionController metricController(CollectorScopedMetricsQueryService service,
                                                     ObservabilityQueryAdmissionService admission) {
            return spy(new OtlpIngestionController(mock(OtlpIngestionWorkspaceService.class),
                    mock(OtlpIngestionRedSummaryService.class), service, admission));
        }
    }
}
