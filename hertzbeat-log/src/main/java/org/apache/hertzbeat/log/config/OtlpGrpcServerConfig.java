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

import io.grpc.ForwardingServerCallListener;
import io.grpc.Metadata;
import io.grpc.Server;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.ServerInterceptors;
import io.grpc.Status;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;
import io.grpc.stub.StreamObserver;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse;
import io.opentelemetry.proto.collector.logs.v1.LogsServiceGrpc;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse;
import io.opentelemetry.proto.collector.metrics.v1.MetricsServiceGrpc;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse;
import io.opentelemetry.proto.collector.trace.v1.TraceServiceGrpc;
import java.io.IOException;
import java.net.InetSocketAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.security.OtlpAccessTokenValidator;
import org.apache.hertzbeat.log.service.OtlpSignalForwarder;
import org.apache.hertzbeat.log.service.SignalQueryRejectedException;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard;
import org.apache.hertzbeat.log.service.SignalWorkloadGuard.Workload;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/** OTLP/gRPC listener for metrics, logs, and traces. */
@Configuration
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class OtlpGrpcServerConfig {

    @Bean(initMethod = "start", destroyMethod = "stop")
    @ConditionalOnProperty(prefix = "hertzbeat.otlp.grpc", name = "enabled", havingValue = "true",
            matchIfMissing = true)
    public OtlpGrpcServerRunner otlpGrpcServerRunner(
            @Value("${hertzbeat.otlp.grpc.host:0.0.0.0}") String host,
            @Value("${hertzbeat.otlp.grpc.port:4317}") int port,
            OtlpSignalForwarder signalForwarder,
            SignalWorkloadGuard workloadGuard,
            ObjectProvider<OtlpAccessTokenValidator> tokenValidatorProvider) {
        OtlpAccessTokenValidator validator = tokenValidatorProvider.getIfAvailable(
                () -> token -> "OTLP token validation is unavailable");
        ServerInterceptor interceptor = new BearerTokenInterceptor(validator);
        return new OtlpGrpcServerRunner(host, port, signalForwarder, workloadGuard, interceptor);
    }

    @Slf4j
    @RequiredArgsConstructor
    static final class OtlpGrpcServerRunner {
        private final String host;
        private final int port;
        private final OtlpSignalForwarder signalForwarder;
        private final SignalWorkloadGuard workloadGuard;
        private final ServerInterceptor authInterceptor;
        private Server server;

        public void start() throws IOException {
            server = NettyServerBuilder.forAddress(new InetSocketAddress(host, port))
                    .addService(ServerInterceptors.intercept(new MetricsService(signalForwarder, workloadGuard),
                            authInterceptor))
                    .addService(ServerInterceptors.intercept(new LogsService(signalForwarder, workloadGuard),
                            authInterceptor))
                    .addService(ServerInterceptors.intercept(new TracesService(signalForwarder, workloadGuard),
                            authInterceptor))
                    .build().start();
            log.info("OTLP gRPC listener started on {}:{}", host, port);
        }

        public void stop() {
            if (server != null) {
                server.shutdownNow();
            }
        }
    }

    @RequiredArgsConstructor
    static final class MetricsService extends MetricsServiceGrpc.MetricsServiceImplBase {
        private final OtlpSignalForwarder signalForwarder;
        private final SignalWorkloadGuard workloadGuard;

        @Override
        public void export(ExportMetricsServiceRequest request,
                           StreamObserver<ExportMetricsServiceResponse> observer) {
            try {
                byte[] response = workloadGuard.execute(Workload.OTLP_WRITE,
                        () -> signalForwarder.forwardProtobuf("metrics", request.toByteArray()));
                observer.onNext(response.length == 0 ? ExportMetricsServiceResponse.getDefaultInstance()
                        : ExportMetricsServiceResponse.parseFrom(response));
                observer.onCompleted();
            } catch (Exception exception) {
                onError(observer, exception);
            }
        }
    }

    @RequiredArgsConstructor
    static final class LogsService extends LogsServiceGrpc.LogsServiceImplBase {
        private final OtlpSignalForwarder signalForwarder;
        private final SignalWorkloadGuard workloadGuard;

        @Override
        public void export(ExportLogsServiceRequest request, StreamObserver<ExportLogsServiceResponse> observer) {
            try {
                byte[] response = workloadGuard.execute(Workload.OTLP_WRITE,
                        () -> signalForwarder.forwardProtobuf("logs", request.toByteArray()));
                observer.onNext(response.length == 0 ? ExportLogsServiceResponse.getDefaultInstance()
                        : ExportLogsServiceResponse.parseFrom(response));
                observer.onCompleted();
            } catch (Exception exception) {
                onError(observer, exception);
            }
        }
    }

    @RequiredArgsConstructor
    static final class TracesService extends TraceServiceGrpc.TraceServiceImplBase {
        private final OtlpSignalForwarder signalForwarder;
        private final SignalWorkloadGuard workloadGuard;

        @Override
        public void export(ExportTraceServiceRequest request, StreamObserver<ExportTraceServiceResponse> observer) {
            try {
                byte[] response = workloadGuard.execute(Workload.OTLP_WRITE,
                        () -> signalForwarder.forwardProtobuf("traces", request.toByteArray()));
                observer.onNext(response.length == 0 ? ExportTraceServiceResponse.getDefaultInstance()
                        : ExportTraceServiceResponse.parseFrom(response));
                observer.onCompleted();
            } catch (Exception exception) {
                onError(observer, exception);
            }
        }
    }

    private static void onError(StreamObserver<?> observer, Exception exception) {
        observer.onError(toGrpcStatus(exception).withDescription(exception.getMessage()).withCause(exception)
                .asRuntimeException());
    }

    static Status toGrpcStatus(Exception exception) {
        if (exception instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT;
        }
        if (exception instanceof SignalQueryRejectedException) {
            return Status.RESOURCE_EXHAUSTED;
        }
        return Status.UNAVAILABLE;
    }

    @RequiredArgsConstructor
    static final class BearerTokenInterceptor implements ServerInterceptor {
        private static final Metadata.Key<String> AUTHORIZATION =
                Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
        private final OtlpAccessTokenValidator tokenValidator;

        @Override
        public <RequestT, ResponseT> ServerCall.Listener<RequestT> interceptCall(
                ServerCall<RequestT, ResponseT> call, Metadata headers,
                ServerCallHandler<RequestT, ResponseT> next) {
            String authorization = headers.get(AUTHORIZATION);
            if (!StringUtils.hasText(authorization) || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
                call.close(Status.UNAUTHENTICATED.withDescription("Missing OTLP access token"), new Metadata());
                return new ServerCall.Listener<>() { };
            }
            String rejectReason = tokenValidator.validate(authorization.substring(7).trim());
            if (rejectReason != null) {
                call.close(Status.UNAUTHENTICATED.withDescription(rejectReason), new Metadata());
                return new ServerCall.Listener<>() { };
            }
            ServerCall.Listener<RequestT> listener = next.startCall(call, headers);
            return new ForwardingServerCallListener.SimpleForwardingServerCallListener<>(listener) { };
        }
    }
}
