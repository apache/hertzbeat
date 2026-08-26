/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.observability.fixture;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.function.Consumer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.output.OutputFrame;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.images.builder.Transferable;
import org.testcontainers.utility.DockerImageName;

/** Builds the pinned Vector fixture with a fully rendered, non-templated HertzBeat endpoint. */
public final class VectorE2eContainer {

    private static final String IMAGE = "timberio/vector:0.57.0-alpine";
    private static final String CONFIG_RESOURCE = "vector.yml";
    private static final String CONFIG_PATH = "/etc/vector/vector.yml";
    private static final String PORT_PLACEHOLDER = "__HERTZBEAT_PORT__";
    private static final int API_PORT = 8686;

    private VectorE2eContainer() {
    }

    public static GenericContainer<?> create(
            int hertzbeatPort, Duration startupTimeout, Consumer<OutputFrame> logConsumer) {
        String config = readConfig().replace(PORT_PLACEHOLDER, Integer.toString(hertzbeatPort));
        return new GenericContainer<>(DockerImageName.parse(IMAGE))
                .withExposedPorts(API_PORT)
                .withCopyToContainer(Transferable.of(config), CONFIG_PATH)
                .withCommand("--config", CONFIG_PATH, "--verbose")
                .withLogConsumer(logConsumer)
                .waitingFor(Wait.forListeningPort())
                .withStartupTimeout(startupTimeout);
    }

    private static String readConfig() {
        try (InputStream input = VectorE2eContainer.class.getClassLoader().getResourceAsStream(CONFIG_RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Vector E2E configuration is missing");
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException failure) {
            throw new IllegalStateException("Cannot read Vector E2E configuration", failure);
        }
    }
}
