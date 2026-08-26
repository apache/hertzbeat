/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.observability.fixture;

import java.time.Duration;
import org.apache.hertzbeat.startup.TrustedStartupSupport;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

/** Shared pinned GreptimeDB data-plane fixture for full-application observability E2E tests. */
public abstract class GreptimeE2eSupport extends TrustedStartupSupport {

    private static final int HTTP_PORT = 4000;
    private static final int GRPC_PORT = 4001;

    @SuppressWarnings("resource")
    protected static final GenericContainer<?> GREPTIME = new GenericContainer<>(
            DockerImageName.parse("greptime/greptimedb:v1.0.1"))
            .withExposedPorts(HTTP_PORT, GRPC_PORT)
            .withCommand("standalone", "start",
                    "--http-addr", "0.0.0.0:" + HTTP_PORT,
                    "--rpc-bind-addr", "0.0.0.0:" + GRPC_PORT)
            .waitingFor(Wait.forListeningPorts(HTTP_PORT, GRPC_PORT))
            .withStartupTimeout(Duration.ofSeconds(120));

    static {
        GREPTIME.start();
    }

    @DynamicPropertySource
    static void greptimeProperties(DynamicPropertyRegistry registry) {
        registry.add("warehouse.store.greptime.http-endpoint", () -> "http://" + GREPTIME.getHost()
                + ":" + GREPTIME.getMappedPort(HTTP_PORT));
        registry.add("warehouse.store.greptime.grpc-endpoints", () -> GREPTIME.getHost()
                + ":" + GREPTIME.getMappedPort(GRPC_PORT));
        registry.add("warehouse.store.greptime.username", () -> "");
        registry.add("warehouse.store.greptime.password", () -> "");
    }
}
