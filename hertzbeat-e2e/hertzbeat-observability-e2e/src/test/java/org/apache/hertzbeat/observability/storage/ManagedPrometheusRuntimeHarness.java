/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.observability.storage;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeBinaryResolver;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeConfigRenderer;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeConfigTransaction;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeHealthClient;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeProcessLauncher;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeProperties;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeSupervisor;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.junit.jupiter.api.Assumptions;

/** Launches the production managed runtime around one real Prometheus source. */
final class ManagedPrometheusRuntimeHarness implements AutoCloseable {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";

    private final OtelRuntimeSupervisor supervisor;

    ManagedPrometheusRuntimeHarness(
            Path home, int serverPort, int prometheusPort, String intakeToken) throws IOException {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real active-source proof");
        List<Integer> ports = reservePorts(4);
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(home);
        properties.setBinary(Path.of(runtimeBinary));
        properties.setCollectorId(GreptimeThreeSignalE2eSupport.COLLECTOR_ID);
        properties.setWorkspaceId("default");
        properties.setToken(intakeToken);
        properties.setExportEndpoint(URI.create("http://127.0.0.1:" + serverPort + "/api/otlp"));
        properties.setHostMetricsEnabled(false);
        properties.setEnvironment(GreptimeThreeSignalE2eSupport.ENVIRONMENT);
        properties.setResourceDetectors(Set.of());
        properties.setPrometheusTargets(List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                GreptimeThreeSignalE2eSupport.SERVICE_NAME,
                URI.create("http://127.0.0.1:" + prometheusPort + "/metrics"),
                Duration.ofSeconds(10))));
        properties.setOtlpGrpcEndpoint("127.0.0.1:" + ports.get(0));
        properties.setOtlpHttpEndpoint("127.0.0.1:" + ports.get(1));
        properties.setHealthPort(ports.get(2));
        properties.setInternalTelemetryPort(ports.get(3));
        properties.setHealthTimeout(Duration.ofMillis(200));
        properties.setValidateTimeout(Duration.ofSeconds(15));
        properties.setStartupTimeout(Duration.ofSeconds(15));
        properties.setShutdownTimeout(Duration.ofSeconds(10));
        supervisor = new OtelRuntimeSupervisor(
                properties,
                new OtelRuntimeBinaryResolver(properties),
                new OtelRuntimeConfigTransaction(new OtelRuntimeConfigRenderer()),
                new OtelRuntimeProcessLauncher(),
                new OtelRuntimeHealthClient());
    }

    void start() {
        supervisor.start();
    }

    private static List<Integer> reservePorts(int count) throws IOException {
        List<ServerSocket> reservations = new ArrayList<>();
        try {
            for (int index = 0; index < count; index++) {
                reservations.add(new ServerSocket(0));
            }
            return reservations.stream().map(ServerSocket::getLocalPort).toList();
        } finally {
            for (ServerSocket reservation : reservations) {
                reservation.close();
            }
        }
    }

    @Override
    public void close() {
        supervisor.close();
    }
}
