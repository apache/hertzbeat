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

package org.apache.hertzbeat.log.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.grpc.ManagedChannel;
import io.grpc.Metadata;
import io.grpc.Server;
import io.grpc.ServerInterceptors;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;
import io.grpc.stub.MetadataUtils;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.MetricsServiceGrpc;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.apache.hertzbeat.common.security.OtlpAccessTokenValidator;
import org.apache.hertzbeat.log.service.OtlpSignalForwarder;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
import org.apache.hertzbeat.log.service.SignalQueryRejectedException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OtlpGrpcServerConfigTest {

    private Server server;
    private ManagedChannel channel;

    @BeforeEach
    void setUp() throws Exception {
        OtlpSignalForwarder forwarder = mock(OtlpSignalForwarder.class);
        SignalWorkloadGuard guard = mock(SignalWorkloadGuard.class);
        OtlpAccessTokenValidator validator = token -> "probe-token".equals(token) ? null : "Invalid token";
        when(guard.execute(eq(SignalWorkloadGuard.Workload.OTLP_WRITE), any())).thenAnswer(invocation -> {
            Supplier<?> action = invocation.getArgument(1);
            return action.get();
        });
        when(forwarder.forwardProtobuf(eq("metrics"), any())).thenReturn(new byte[0]);
        server = NettyServerBuilder.forPort(0)
                .addService(ServerInterceptors.intercept(
                        new OtlpGrpcServerConfig.MetricsService(forwarder, guard),
                        new OtlpGrpcServerConfig.BearerTokenInterceptor(validator)))
                .build().start();
        channel = NettyChannelBuilder.forAddress("127.0.0.1", server.getPort()).usePlaintext().build();
    }

    @AfterEach
    void tearDown() throws Exception {
        channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
        server.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
    }

    @Test
    void shouldAcceptAuthorizedOtlpGrpcMetricsRequest() {
        Metadata headers = new Metadata();
        headers.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER), "Bearer probe-token");
        ExportMetricsServiceResponse response = MetricsServiceGrpc.newBlockingStub(channel)
                .withInterceptors(MetadataUtils.newAttachHeadersInterceptor(headers))
                .export(ExportMetricsServiceRequest.getDefaultInstance());

        assertThat(response).isEqualTo(ExportMetricsServiceResponse.getDefaultInstance());
    }

    @Test
    void shouldRejectMissingOtlpGrpcBearerToken() {
        assertThatThrownBy(() -> MetricsServiceGrpc.newBlockingStub(channel)
                .export(ExportMetricsServiceRequest.getDefaultInstance()))
                .isInstanceOfSatisfying(StatusRuntimeException.class,
                        exception -> assertThat(exception.getStatus().getCode())
                                .isEqualTo(Status.Code.UNAUTHENTICATED));
    }

    @Test
    void shouldMapGrpcFailuresWithoutHidingClientAndCapacityErrors() {
        assertThat(OtlpGrpcServerConfig.toGrpcStatus(new IllegalArgumentException("payload")))
                .isEqualTo(Status.INVALID_ARGUMENT);
        assertThat(OtlpGrpcServerConfig.toGrpcStatus(new SignalQueryRejectedException("OTLP_WRITE")))
                .isEqualTo(Status.RESOURCE_EXHAUSTED);
        assertThat(OtlpGrpcServerConfig.toGrpcStatus(new IllegalStateException("storage")))
                .isEqualTo(Status.UNAVAILABLE);
    }
}
