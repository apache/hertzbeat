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

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Duration;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Enforces the local security boundary for OTLP listeners.
 */
final class OtelRuntimeGatewayPolicy {

    private static final Duration MINIMUM_TIMEOUT = Duration.ofSeconds(1);
    private static final Duration MAXIMUM_TIMEOUT = Duration.ofMinutes(5);
    private static final int MINIMUM_BEARER_TOKEN_LENGTH = 16;
    private static final int MAXIMUM_BEARER_TOKEN_LENGTH = 4096;
    private static final int MAXIMUM_BEARER_TOKENS = 16;
    private static final Set<PosixFilePermission> UNSAFE_SECRET_PERMISSIONS = Set.of(
            PosixFilePermission.GROUP_READ,
            PosixFilePermission.GROUP_WRITE,
            PosixFilePermission.GROUP_EXECUTE,
            PosixFilePermission.OTHERS_READ,
            PosixFilePermission.OTHERS_WRITE,
            PosixFilePermission.OTHERS_EXECUTE
    );

    ResolvedGateway resolve(OtelRuntimeProperties properties) throws IOException {
        String grpcEndpoint = endpoint(properties.getOtlpGrpcEndpoint(), "OTLP gRPC");
        String httpEndpoint = endpoint(properties.getOtlpHttpEndpoint(), "OTLP HTTP");
        boolean gatewayEnabled = properties.isOtlpGatewayEnabled();
        if (!gatewayEnabled && (!isLoopback(grpcEndpoint) || !isLoopback(httpEndpoint))) {
            throw new IllegalArgumentException("Non-loopback OTLP listeners require explicit Gateway mode");
        }
        Duration readTimeout = timeout(properties.getOtlpReadTimeout(), "read");
        Duration writeTimeout = timeout(properties.getOtlpWriteTimeout(), "write");
        Duration idleTimeout = timeout(properties.getOtlpIdleTimeout(), "idle");
        if (!gatewayEnabled) {
            return new ResolvedGateway(grpcEndpoint, httpEndpoint, false,
                    readTimeout, writeTimeout, idleTimeout, null, null, null, null);
        }
        Path certificate = regularFile(properties, properties.getOtlpGatewayCertificateFile(),
                "Gateway TLS certificate");
        Path privateKey = regularFile(properties, properties.getOtlpGatewayPrivateKeyFile(),
                "Gateway TLS private key");
        ownerOnly(privateKey, "Gateway TLS private key");
        Path clientCa = optionalRegularFile(properties, properties.getOtlpGatewayClientCaFile(),
                "Gateway client CA");
        String inlineToken = properties.getOtlpGatewayBearerToken() == null
                ? "" : properties.getOtlpGatewayBearerToken();
        Path tokenFile = optionalRegularFile(properties, properties.getOtlpGatewayBearerTokenFile(),
                "Gateway bearer token file");
        if (inlineToken.isEmpty() == (tokenFile == null)) {
            throw new IllegalArgumentException("Gateway mode requires exactly one bearer token source");
        }
        if (!inlineToken.isEmpty() && !validToken(inlineToken)) {
            throw new IllegalArgumentException("Gateway bearer token must be 16 to 4096 non-whitespace characters");
        }
        if (tokenFile != null) {
            ownerOnly(tokenFile, "Gateway bearer token file");
            long tokenFileSize = Files.size(tokenFile);
            if (tokenFileSize < 1 || tokenFileSize > 64 * 1024) {
                throw new IllegalArgumentException("Gateway bearer token file must be between 1 byte and 64 KiB");
            }
            validateTokenFile(tokenFile);
        }
        return new ResolvedGateway(grpcEndpoint, httpEndpoint, true,
                readTimeout, writeTimeout, idleTimeout, certificate, privateKey, clientCa, tokenFile);
    }

    private static String endpoint(String value, String label) {
        String endpoint = value == null ? "" : value.trim();
        try {
            URI uri = URI.create("tcp://" + endpoint);
            if (uri.getHost() == null || uri.getPort() < 1 || uri.getPort() > 65535
                    || uri.getUserInfo() != null || !uri.getRawPath().isEmpty()
                    || uri.getRawQuery() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException();
            }
            return endpoint;
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(label + " endpoint must be a host and port", exception);
        }
    }

    private static boolean isLoopback(String endpoint) {
        String host = URI.create("tcp://" + endpoint).getHost().toLowerCase(Locale.ROOT);
        if ("localhost".equals(host) || "::1".equals(host) || "[::1]".equals(host)) {
            return true;
        }
        if (!host.startsWith("127.")) {
            return false;
        }
        String[] octets = host.split("\\.");
        if (octets.length != 4) {
            return false;
        }
        try {
            for (String octet : octets) {
                int value = Integer.parseInt(octet);
                if (value < 0 || value > 255) {
                    return false;
                }
            }
            return true;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }

    private static Duration timeout(Duration value, String label) {
        if (value == null || value.compareTo(MINIMUM_TIMEOUT) < 0 || value.compareTo(MAXIMUM_TIMEOUT) > 0
                || value.getNano() != 0) {
            throw new IllegalArgumentException("OTLP " + label + " timeout must be a whole second between 1s and 5m");
        }
        return value;
    }

    private static Path regularFile(OtelRuntimeProperties properties, Path path, String label) throws IOException {
        Path file = optionalRegularFile(properties, path, label);
        if (file == null) {
            throw new IllegalArgumentException(label + " is required in Gateway mode");
        }
        return file;
    }

    private static Path optionalRegularFile(OtelRuntimeProperties properties, Path path, String label)
            throws IOException {
        if (path == null) {
            return null;
        }
        Path file = OtelRuntimeConfigRenderer.resolve(properties.getHome(), path).toRealPath();
        if (!Files.isRegularFile(file)) {
            throw new IllegalArgumentException(label + " must be a regular file");
        }
        return file;
    }

    private static void ownerOnly(Path file, String label) throws IOException {
        if (!Files.getFileStore(file).supportsFileAttributeView("posix")) {
            return;
        }
        Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(file);
        if (permissions.stream().anyMatch(UNSAFE_SECRET_PERMISSIONS::contains)) {
            throw new IllegalArgumentException(label + " must not be accessible by group or other users");
        }
    }

    private static void validateTokenFile(Path tokenFile) throws IOException {
        Set<String> tokens = new HashSet<>();
        for (String line : Files.readAllLines(tokenFile)) {
            String stripped = line.strip();
            if (stripped.isEmpty()) {
                continue;
            }
            String token = stripped.split("\\s+", 2)[0];
            if (!validToken(token)) {
                throw new IllegalArgumentException(
                        "Gateway bearer token file contains a token outside the 16 to 4096 character limit");
            }
            tokens.add(token);
        }
        if (tokens.isEmpty() || tokens.size() > MAXIMUM_BEARER_TOKENS) {
            throw new IllegalArgumentException("Gateway bearer token file must contain 1 to 16 unique tokens");
        }
    }

    private static boolean validToken(String token) {
        return token.length() >= MINIMUM_BEARER_TOKEN_LENGTH
                && token.length() <= MAXIMUM_BEARER_TOKEN_LENGTH
                && token.chars().noneMatch(Character::isWhitespace);
    }

    /**
     * OTLP listener settings after local security policy enforcement.
     */
    record ResolvedGateway(String grpcEndpoint, String httpEndpoint, boolean enabled,
                           Duration readTimeout, Duration writeTimeout, Duration idleTimeout,
                           Path certificateFile, Path privateKeyFile, Path clientCaFile, Path bearerTokenFile) {
    }
}
