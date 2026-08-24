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

package org.apache.hertzbeat.observability.config;

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
import org.apache.hertzbeat.observability.service.OtlpLogIngestionService;
import org.apache.hertzbeat.observability.service.OtlpSignalForwarder;
import org.apache.hertzbeat.observability.service.SignalQueryRejectedException;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard;
import org.apache.hertzbeat.observability.service.SignalWorkloadGuard.Workload;
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
            @Value("${hertzbeat.otlp.grpc.port:14317}") int port,
            OtlpSignalForwarder signalForwarder,
            OtlpLogIngestionService logIngestionService,
            SignalWorkloadGuard workloadGuard,
            ObjectProvider<OtlpAccessTokenValidator> tokenValidatorProvider) {
        OtlpAccessTokenValidator validator = tokenValidatorProvider.getIfAvailable(
                () -> token -> "OTLP token validation is unavailable");
        ServerInterceptor interceptor = new BearerTokenInterceptor(validator);
        return new OtlpGrpcServerRunner(host, port, signalForwarder, logIngestionService,
                workloadGuard, interceptor);
    }

    @Slf4j
    @RequiredArgsConstructor
    static final class OtlpGrpcServerRunner {
        private final String host;
        private final int port;
        private final OtlpSignalForwarder signalForwarder;
        private final OtlpLogIngestionService logIngestionService;
        private final SignalWorkloadGuard workloadGuard;
        private final ServerInterceptor authInterceptor;
        private Server server;

        /**
         * Binds the OTLP/gRPC listener, or gives it up for this run.
         *
         * <p>The default 14317 keeps clear of 4317, the OpenTelemetry standard port an OTel Collector
         * on the same host would already hold - and that host is exactly the one most likely to want
         * this listener. A bind can still fail for other reasons, and letting it escape would abort
         * the whole context: an optional side channel would then keep the monitoring system itself
         * from starting, while HTTP ingestion on the main port stays perfectly able to serve the same
         * signals. Degrade to "unavailable" and say how to fix it.
         */
        public void start() {
            try {
                server = NettyServerBuilder.forAddress(new InetSocketAddress(host, port))
                        .addService(ServerInterceptors.intercept(new MetricsService(signalForwarder, workloadGuard),
                                authInterceptor))
                        .addService(ServerInterceptors.intercept(new LogsService(logIngestionService, workloadGuard),
                                authInterceptor))
                        .addService(ServerInterceptors.intercept(new TracesService(signalForwarder, workloadGuard),
                                authInterceptor))
                        .build().start();
                log.info("OTLP gRPC listener started on {}:{}", host, port);
            } catch (IOException exception) {
                server = null;
                log.error("OTLP gRPC listener could not bind {}:{}, so gRPC ingestion is unavailable for this run. "
                        + "OTLP/HTTP ingestion on /api/otlp/v1 is unaffected. Set hertzbeat.otlp.grpc.port to a free "
                        + "port, or hertzbeat.otlp.grpc.enabled=false to stop starting it.", host, port, exception);
            }
        }

        boolean isRunning() {
            return server != null;
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
        private final OtlpLogIngestionService logIngestionService;
        private final SignalWorkloadGuard workloadGuard;

        @Override
        public void export(ExportLogsServiceRequest request, StreamObserver<ExportLogsServiceResponse> observer) {
            try {
                byte[] response = workloadGuard.execute(Workload.OTLP_WRITE,
                        () -> logIngestionService.ingestProtobuf(request.toByteArray()));
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
