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

import com.usthe.sureness.util.JsonWebTokenUtil;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.Server;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.ServerInterceptors;
import io.grpc.Status;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;
import io.jsonwebtoken.Claims;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityAccessTokenGateway;
import org.apache.hertzbeat.observability.ingestion.grpc.OtlpGrpcLogsService;
import org.apache.hertzbeat.observability.ingestion.grpc.OtlpGrpcMetricsService;
import org.apache.hertzbeat.observability.ingestion.grpc.OtlpGrpcTraceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OTLP gRPC server configuration.
 */
@Configuration
public class OtlpGrpcServerConfig {

    @Bean(initMethod = "start", destroyMethod = "stop")
    @ConditionalOnProperty(prefix = "hertzbeat.otlp.grpc", name = "enabled", havingValue = "true")
    public OtlpGrpcServerRunner otlpGrpcServerRunner(
            @Value("${hertzbeat.otlp.grpc.host:0.0.0.0}") String host,
            @Value("${hertzbeat.otlp.grpc.port:4317}") int port,
            OtlpGrpcMetricsService metricsService,
            OtlpGrpcLogsService logsService,
            OtlpGrpcTraceService traceService,
            ObservabilityAccessTokenGateway accessTokenGateway
    ) {
        return new OtlpGrpcServerRunner(
                host,
                port,
                metricsService,
                logsService,
                traceService,
                new BearerTokenInterceptor(accessTokenGateway)
        );
    }

    @Slf4j
    @RequiredArgsConstructor
    static final class OtlpGrpcServerRunner {
        private final String host;
        private final int port;
        private final OtlpGrpcMetricsService metricsService;
        private final OtlpGrpcLogsService logsService;
        private final OtlpGrpcTraceService traceService;
        private final ServerInterceptor authInterceptor;
        private Server server;

        public void start() throws IOException {
            server = NettyServerBuilder.forAddress(new InetSocketAddress(host, port))
                    .addService(ServerInterceptors.intercept(metricsService, authInterceptor))
                    .addService(ServerInterceptors.intercept(logsService, authInterceptor))
                    .addService(ServerInterceptors.intercept(traceService, authInterceptor))
                    .build()
                    .start();
            log.info("OTLP gRPC server started on {}:{}", host, port);
        }

        public void stop() {
            if (server != null) {
                server.shutdownNow();
                log.info("OTLP gRPC server stopped.");
            }
        }
    }

    @RequiredArgsConstructor
    static final class BearerTokenInterceptor implements ServerInterceptor {
        private static final Metadata.Key<String> AUTHORIZATION =
                Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
        private final ObservabilityAccessTokenGateway accessTokenGateway;

        @Override
        public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(ServerCall<ReqT, RespT> call,
                                                                     Metadata headers,
                                                                     ServerCallHandler<ReqT, RespT> next) {
            String authorization = headers.get(AUTHORIZATION);
            if (!StringUtils.startsWithIgnoreCase(StringUtils.defaultString(authorization), "Bearer ")) {
                call.close(Status.UNAUTHENTICATED.withDescription("Missing OTLP access token."), new Metadata());
                return new ServerCall.Listener<>() {
                };
            }
            String token = StringUtils.substringAfter(authorization, "Bearer ").trim();
            try {
                Claims claims = JsonWebTokenUtil.parseJwt(token);
                Boolean refresh = claims.get("refresh", Boolean.class);
                if (Boolean.TRUE.equals(refresh)) {
                    throw new IllegalArgumentException("Refresh token is not allowed.");
                }
                Boolean managed = claims.get(ObservabilityAccessTokenGateway.CLAIM_MANAGED, Boolean.class);
                if (!Boolean.TRUE.equals(managed)) {
                    throw new IllegalArgumentException("Managed token is required.");
                }
                String rejectReason = accessTokenGateway.checkTokenStatus(token);
                if (rejectReason != null) {
                    call.close(Status.UNAUTHENTICATED.withDescription(rejectReason), new Metadata());
                    return new ServerCall.Listener<>() {
                    };
                }
                String userId = claims.getSubject();
                @SuppressWarnings("unchecked")
                List<String> claimedRoles = claims.get("roles", List.class);
                rejectReason = accessTokenGateway.checkManagedTokenAccess(
                        userId,
                        claimedRoles == null ? Collections.emptyList() : claimedRoles
                );
                if (rejectReason != null) {
                    call.close(Status.UNAUTHENTICATED.withDescription(rejectReason), new Metadata());
                    return new ServerCall.Listener<>() {
                    };
                }
                accessTokenGateway.touchTokenLastUsedTime(token);
            } catch (Exception ex) {
                call.close(Status.UNAUTHENTICATED.withDescription("Invalid OTLP access token."), new Metadata());
                return new ServerCall.Listener<>() {
                };
            }
            return Contexts.interceptCall(io.grpc.Context.current(), call, headers, next);
        }
    }
}
