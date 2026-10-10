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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.grpc.ManagedChannel;
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.netty.shaded.io.grpc.netty.GrpcSslContexts;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;
import io.grpc.stub.MetadataUtils;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.MetricsServiceGrpc;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.time.Duration;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeGatewayIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final String INITIAL_TOKEN = "gateway-initial-token";
    private static final String ROTATED_TOKEN = "gateway-rotated-token";
    private static final int MAX_REQUEST_BYTES = 4 * 1024 * 1024;

    @TempDir
    private Path tempDir;

    @Test
    void enforcesTlsBearerRotationPayloadLimitsAndGracefulDrain() throws Exception {
        String runtimeBinary = requiredRuntimeBinary();
        OtelRuntimeTlsFixture.CertificatePair serverCertificate = certificates().server();
        Path tokenFile = Files.writeString(tempDir.resolve("gateway.token"), INITIAL_TOKEN);
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(tokenFile);
        OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture();
        capture.start();
        OtelRuntimeProperties properties = gatewayProperties(
                runtimeBinary, capture.port(), serverCertificate, tokenFile, "collector-gateway-integration");
        properties.setShutdownTimeout(Duration.ofSeconds(20));
        OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
        ManagedChannel channel = null;
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            HttpClient client = trustedHttpClient(serverCertificate.certificate());
            URI metricsEndpoint = gatewayUri(properties, "metrics");

            assertEquals(401, send(client, metricsEndpoint, null, metricJson("missing-token")).statusCode());
            assertEquals(401, send(client, metricsEndpoint, "wrong-token-value",
                    metricJson("wrong-token")).statusCode());
            assertEquals(200, send(client, metricsEndpoint, INITIAL_TOKEN,
                    metricJson("hertzbeat_gateway_tls_metric")).statusCode());
            assertEquals(400, send(client, metricsEndpoint, INITIAL_TOKEN,
                    "not-json".getBytes(StandardCharsets.UTF_8)).statusCode());

            assertEquals(200, send(client, metricsEndpoint, INITIAL_TOKEN,
                    paddedEmptyMetrics(MAX_REQUEST_BYTES)).statusCode());
            HttpResponse<String> oversized = send(client, metricsEndpoint, INITIAL_TOKEN,
                    paddedEmptyMetrics(MAX_REQUEST_BYTES + 1));
            assertEquals(400, oversized.statusCode(), oversized.body());
            assertTrue(oversized.body().contains("request body too large"), oversized.body());

            channel = tlsChannel(properties.getOtlpGrpcEndpoint(), serverCertificate, null);
            MetricsServiceGrpc.MetricsServiceBlockingStub unauthenticatedStub =
                    MetricsServiceGrpc.newBlockingStub(channel);
            StatusRuntimeException missingToken = assertThrows(StatusRuntimeException.class,
                    () -> unauthenticatedStub.export(ExportMetricsServiceRequest.getDefaultInstance()));
            assertEquals(Status.Code.UNAUTHENTICATED, missingToken.getStatus().getCode());
            MetricsServiceGrpc.newBlockingStub(channel)
                    .withInterceptors(bearerToken(INITIAL_TOKEN))
                    .export(ExportMetricsServiceRequest.getDefaultInstance());

            Files.writeString(tokenFile, ROTATED_TOKEN);
            awaitHttpStatus(client, metricsEndpoint, ROTATED_TOKEN, 200, Duration.ofSeconds(5));
            assertEquals(401, send(client, metricsEndpoint, INITIAL_TOKEN,
                    metricJson("expired-token")).statusCode());

            assertEquals(200, send(client, metricsEndpoint, ROTATED_TOKEN,
                    metricJson("hertzbeat_gateway_drain_metric")).statusCode());
            supervisor.close();
            OtelRuntimeTestSupport.await(
                    () -> capture.contains("hertzbeat_gateway_drain_metric"), Duration.ofSeconds(20));
            assertEquals(OtelRuntimeState.STOPPED, supervisor.snapshot().state());
        } finally {
            if (channel != null) {
                channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
            }
            supervisor.close();
            capture.close();
        }
    }

    @Test
    void requiresClientCertificateWhenMutualTlsIsEnabled() throws Exception {
        String runtimeBinary = requiredRuntimeBinary();
        OtelRuntimeTlsFixture tls = certificates();
        OtelRuntimeTlsFixture.CertificatePair serverCertificate = tls.server();
        OtelRuntimeTlsFixture.CertificatePair clientCertificate = tls.client();
        OtelRuntimeTestSupport.OtlpCapture capture = new OtelRuntimeTestSupport.OtlpCapture();
        capture.start();
        OtelRuntimeProperties properties = gatewayProperties(
                runtimeBinary, capture.port(), serverCertificate, null, "collector-gateway-mtls-integration");
        properties.setOtlpGatewayClientCaFile(clientCertificate.certificate());
        OtelRuntimeSupervisor supervisor = OtelRuntimeTestSupport.supervisor(properties);
        ManagedChannel channelWithoutClient = null;
        ManagedChannel authenticatedChannel = null;
        try {
            supervisor.start();
            assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
            channelWithoutClient = tlsChannel(properties.getOtlpGrpcEndpoint(), serverCertificate, null);
            MetricsServiceGrpc.MetricsServiceBlockingStub tokenOnlyStub = MetricsServiceGrpc
                    .newBlockingStub(channelWithoutClient).withInterceptors(bearerToken(INITIAL_TOKEN));
            StatusRuntimeException missingCertificate = assertThrows(StatusRuntimeException.class,
                    () -> tokenOnlyStub.export(ExportMetricsServiceRequest.getDefaultInstance()));
            assertEquals(Status.Code.UNAVAILABLE, missingCertificate.getStatus().getCode());

            authenticatedChannel = tlsChannel(
                    properties.getOtlpGrpcEndpoint(), serverCertificate, clientCertificate);
            MetricsServiceGrpc.MetricsServiceBlockingStub authenticatedStub = MetricsServiceGrpc
                    .newBlockingStub(authenticatedChannel).withInterceptors(bearerToken(INITIAL_TOKEN));
            authenticatedStub.export(ExportMetricsServiceRequest.getDefaultInstance());
            MetricsServiceGrpc.MetricsServiceBlockingStub wrongTokenStub = MetricsServiceGrpc
                    .newBlockingStub(authenticatedChannel).withInterceptors(bearerToken("wrong-token-value"));
            StatusRuntimeException wrongToken = assertThrows(StatusRuntimeException.class,
                    () -> wrongTokenStub.export(ExportMetricsServiceRequest.getDefaultInstance()));
            assertEquals(Status.Code.UNAUTHENTICATED, wrongToken.getStatus().getCode());
        } finally {
            shutdown(channelWithoutClient);
            shutdown(authenticatedChannel);
            supervisor.close();
            capture.close();
        }
    }

    private String requiredRuntimeBinary() {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime proof");
        Assumptions.assumeTrue(OtelRuntimeTlsFixture.opensslAvailable(), "OpenSSL is required for the TLS proof");
        return runtimeBinary;
    }

    private OtelRuntimeTlsFixture certificates() throws Exception {
        return new OtelRuntimeTlsFixture(Files.createDirectories(tempDir.resolve("certificates")));
    }

    private OtelRuntimeProperties gatewayProperties(
            String runtimeBinary, int exportPort, OtelRuntimeTlsFixture.CertificatePair serverCertificate,
            Path tokenFile, String collectorId) throws Exception {
        OtelRuntimeProperties properties = OtelRuntimeTestSupport.properties(
                tempDir, runtimeBinary, exportPort, collectorId);
        properties.setOtlpGatewayEnabled(true);
        properties.setOtlpGatewayCertificateFile(serverCertificate.certificate());
        properties.setOtlpGatewayPrivateKeyFile(serverCertificate.privateKey());
        if (tokenFile == null) {
            properties.setOtlpGatewayBearerToken(INITIAL_TOKEN);
        } else {
            properties.setOtlpGatewayBearerTokenFile(tokenFile);
        }
        return properties;
    }

    private static URI gatewayUri(OtelRuntimeProperties properties, String signal) {
        return URI.create("https://" + properties.getOtlpHttpEndpoint() + "/v1/" + signal);
    }

    private static HttpResponse<String> send(HttpClient client, URI endpoint, String token, byte[] payload)
            throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(endpoint)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(payload));
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void awaitHttpStatus(
            HttpClient client, URI endpoint, String token, int expectedStatus, Duration timeout) throws Exception {
        long deadline = System.nanoTime() + timeout.toNanos();
        int status;
        do {
            status = send(client, endpoint, token, metricJson("rotated-token")).statusCode();
            if (status == expectedStatus) {
                return;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        assertEquals(expectedStatus, status, "token file was not reloaded before deadline");
    }

    private static byte[] metricJson(String name) {
        long now = System.currentTimeMillis() * 1_000_000;
        return ("""
                {"resourceMetrics":[{"scopeMetrics":[{"metrics":[{
                  "name":"%s","gauge":{"dataPoints":[{"timeUnixNano":"%d","asDouble":1.0}]}
                }]}]}]}
                """.formatted(name, now)).getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] paddedEmptyMetrics(int length) {
        byte[] prefix = "{\"resourceMetrics\":[]}".getBytes(StandardCharsets.UTF_8);
        assertTrue(length >= prefix.length);
        byte[] body = new byte[length];
        Arrays.fill(body, (byte) ' ');
        System.arraycopy(prefix, 0, body, 0, prefix.length);
        return body;
    }

    private static HttpClient trustedHttpClient(Path certificate) throws Exception {
        CertificateFactory factory = CertificateFactory.getInstance("X.509");
        KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
        trustStore.load(null);
        try (InputStream input = Files.newInputStream(certificate)) {
            trustStore.setCertificateEntry("gateway", factory.generateCertificate(input));
        }
        TrustManagerFactory trustManagers = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        trustManagers.init(trustStore);
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, trustManagers.getTrustManagers(), null);
        return HttpClient.newBuilder().sslContext(context).build();
    }

    private static ManagedChannel tlsChannel(
            String endpoint, OtelRuntimeTlsFixture.CertificatePair serverCertificate,
            OtelRuntimeTlsFixture.CertificatePair clientCertificate) throws Exception {
        io.grpc.netty.shaded.io.netty.handler.ssl.SslContextBuilder ssl = GrpcSslContexts.forClient()
                .trustManager(serverCertificate.certificate().toFile());
        if (clientCertificate != null) {
            ssl.keyManager(clientCertificate.certificate().toFile(), clientCertificate.privateKey().toFile());
        }
        return NettyChannelBuilder.forTarget(endpoint).sslContext(ssl.build()).build();
    }

    private static io.grpc.ClientInterceptor bearerToken(String token) {
        Metadata headers = new Metadata();
        headers.put(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER), "Bearer " + token);
        return MetadataUtils.newAttachHeadersInterceptor(headers);
    }

    private static void shutdown(ManagedChannel channel) throws InterruptedException {
        if (channel != null) {
            channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
