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

package org.apache.hertzbeat.observability.ingestion.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.util.JsonWebTokenUtil;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.Status;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityAccessTokenGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link OtlpGrpcServerConfig.BearerTokenInterceptor}.
 */
@ExtendWith(MockitoExtension.class)
class OtlpGrpcServerConfigTest {

    private static final Metadata.Key<String> AUTHORIZATION =
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> WORKSPACE_ID =
            Metadata.Key.of(AuthTokenScopes.WORKSPACE_ID_HEADER.toLowerCase(), Metadata.ASCII_STRING_MARSHALLER);

    @Mock
    private ObservabilityAccessTokenGateway accessTokenGateway;

    @Mock
    private ServerCall<Object, Object> call;

    @Mock
    private ServerCallHandler<Object, Object> next;

    private OtlpGrpcServerConfig.BearerTokenInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new OtlpGrpcServerConfig.BearerTokenInterceptor(accessTokenGateway);
        JsonWebTokenUtil.setDefaultSecretKey("otlp-grpc-interceptor-test-secret-0123456789abcdef");
    }

    @Test
    void shouldAllowManagedApiToken() {
        String token = issueManagedToken();
        Metadata headers = bearerHeaders(token);
        when(accessTokenGateway.checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST)).thenReturn(null);
        when(accessTokenGateway.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        when(next.startCall(any(), any())).thenReturn(new ServerCall.Listener<>() {
        });

        interceptor.interceptCall(call, headers, next);

        verify(next).startCall(call, headers);
        verify(accessTokenGateway).checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST);
        verify(accessTokenGateway).checkManagedTokenAccess("admin", List.of("admin"));
        verify(accessTokenGateway).touchTokenLastUsedTime(token);
    }

    @Test
    void shouldValidateWorkspaceBoundManagedApiToken() {
        String token = issueManagedToken();
        Metadata headers = bearerHeaders(token);
        headers.put(WORKSPACE_ID, "prod-west");
        when(accessTokenGateway.checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST, "prod-west")).thenReturn(null);
        when(accessTokenGateway.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        when(next.startCall(any(), any())).thenReturn(new ServerCall.Listener<>() {
        });

        interceptor.interceptCall(call, headers, next);

        verify(next).startCall(call, headers);
        verify(accessTokenGateway).checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST, "prod-west");
    }

    @Test
    void shouldBindWorkspaceContextAcrossGrpcCallLifecycle() {
        AuthTokenRequestContext.clear();
        String token = issueManagedToken();
        Metadata headers = bearerHeaders(token);
        headers.put(WORKSPACE_ID, " prod-west ");
        when(accessTokenGateway.checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST, "prod-west")).thenReturn(null);
        when(accessTokenGateway.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);
        when(next.startCall(any(), any())).thenAnswer(invocation -> {
            assertEquals("prod-west", AuthTokenRequestContext.currentWorkspaceId());
            return new ServerCall.Listener<>() {
            };
        });

        ServerCall.Listener<Object> listener = interceptor.interceptCall(call, headers, next);

        assertNull(AuthTokenRequestContext.currentWorkspaceId());
        listener.onHalfClose();
        assertNull(AuthTokenRequestContext.currentWorkspaceId());
        listener.onComplete();
        assertNull(AuthTokenRequestContext.currentWorkspaceId());
    }

    @Test
    void shouldRejectPlainAccessTokenWithoutManagedClaim() {
        String token = JsonWebTokenUtil.issueJwt("admin", 3600L, List.of("admin"));
        Metadata headers = bearerHeaders(token);

        interceptor.interceptCall(call, headers, next);

        ArgumentCaptor<Status> statusCaptor = ArgumentCaptor.forClass(Status.class);
        verify(call).close(statusCaptor.capture(), any(Metadata.class));
        verify(next, never()).startCall(any(), any());
        verify(accessTokenGateway, never()).checkTokenStatus(any());
        assertEquals(Status.Code.UNAUTHENTICATED, statusCaptor.getValue().getCode());
    }

    @Test
    void shouldRejectRefreshToken() {
        String token = JsonWebTokenUtil.issueJwt("admin", 3600L, Map.of("refresh", true));
        Metadata headers = bearerHeaders(token);

        interceptor.interceptCall(call, headers, next);

        ArgumentCaptor<Status> statusCaptor = ArgumentCaptor.forClass(Status.class);
        verify(call).close(statusCaptor.capture(), any(Metadata.class));
        verify(next, never()).startCall(any(), any());
        assertEquals(Status.Code.UNAUTHENTICATED, statusCaptor.getValue().getCode());
    }

    @Test
    void shouldRejectRevokedManagedToken() {
        String token = issueManagedToken();
        Metadata headers = bearerHeaders(token);
        when(accessTokenGateway.checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST)).thenReturn("Token has been revoked");

        interceptor.interceptCall(call, headers, next);

        ArgumentCaptor<Status> statusCaptor = ArgumentCaptor.forClass(Status.class);
        verify(call).close(statusCaptor.capture(), any(Metadata.class));
        verify(next, never()).startCall(any(), any());
        verify(accessTokenGateway).checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST);
        verify(accessTokenGateway, never()).checkManagedTokenAccess(any(), any());
        verify(accessTokenGateway, never()).touchTokenLastUsedTime(any());
        assertEquals(Status.Code.UNAUTHENTICATED, statusCaptor.getValue().getCode());
    }

    @Test
    void shouldRejectManagedTokenWhoseOwnerNoLongerHasRequiredAccess() {
        String token = issueManagedToken();
        Metadata headers = bearerHeaders(token);
        when(accessTokenGateway.checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST)).thenReturn(null);
        when(accessTokenGateway.checkManagedTokenAccess("admin", List.of("admin")))
                .thenReturn("Token owner account is no longer valid");

        interceptor.interceptCall(call, headers, next);

        ArgumentCaptor<Status> statusCaptor = ArgumentCaptor.forClass(Status.class);
        verify(call).close(statusCaptor.capture(), any(Metadata.class));
        verify(next, never()).startCall(any(), any());
        verify(accessTokenGateway).checkTokenStatus(token, AuthTokenScopes.OTLP_INGEST);
        verify(accessTokenGateway).checkManagedTokenAccess("admin", List.of("admin"));
        verify(accessTokenGateway, never()).touchTokenLastUsedTime(any());
        assertEquals(Status.Code.UNAUTHENTICATED, statusCaptor.getValue().getCode());
    }

    private static Metadata bearerHeaders(String token) {
        Metadata headers = new Metadata();
        headers.put(AUTHORIZATION, "Bearer " + token);
        return headers;
    }

    private static String issueManagedToken() {
        Map<String, Object> customClaims = new HashMap<>(1);
        customClaims.put(ObservabilityAccessTokenGateway.CLAIM_MANAGED, true);
        return JsonWebTokenUtil.issueJwt("admin", 3600L, List.of("admin"), customClaims);
    }
}
