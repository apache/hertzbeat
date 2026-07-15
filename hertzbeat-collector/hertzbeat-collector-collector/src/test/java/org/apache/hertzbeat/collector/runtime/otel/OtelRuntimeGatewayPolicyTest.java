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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Duration;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeGatewayPolicyTest {

    @TempDir
    private Path tempDir;

    @Test
    void keepsDefaultAgentListenersOnLoopbackWithoutAuthentication() throws Exception {
        OtelRuntimeProperties properties = properties();

        OtelRuntimeGatewayPolicy.ResolvedGateway gateway = new OtelRuntimeGatewayPolicy().resolve(properties);

        assertFalse(gateway.enabled());
        assertEquals("127.0.0.1:4317", gateway.grpcEndpoint());
        assertEquals("127.0.0.1:4318", gateway.httpEndpoint());
    }

    @Test
    void rejectsPublicListenersWithoutExplicitGatewayMode() {
        OtelRuntimeProperties properties = properties();
        properties.setOtlpGrpcEndpoint("0.0.0.0:4317");

        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeGatewayPolicy().resolve(properties));
    }

    @Test
    void requiresTlsAndExactlyOneStrongBearerTokenSource() throws Exception {
        OtelRuntimeProperties properties = gatewayProperties();

        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeGatewayPolicy().resolve(properties));

        Path certificate = Files.writeString(tempDir.resolve("gateway.crt"), "certificate");
        Path privateKey = Files.writeString(tempDir.resolve("gateway.key"), "private-key");
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(privateKey);
        properties.setOtlpGatewayCertificateFile(certificate);
        properties.setOtlpGatewayPrivateKeyFile(privateKey);
        properties.setOtlpGatewayBearerToken("weak");
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeGatewayPolicy().resolve(properties));

        Path tokenFile = Files.writeString(tempDir.resolve("gateway.tokens"), "rotating-token-value");
        OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(tokenFile);
        properties.setOtlpGatewayBearerToken("strong-inline-token");
        properties.setOtlpGatewayBearerTokenFile(tokenFile);
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeGatewayPolicy().resolve(properties));

        properties.setOtlpGatewayBearerToken("");
        OtelRuntimeGatewayPolicy.ResolvedGateway gateway = new OtelRuntimeGatewayPolicy().resolve(properties);
        assertTrue(gateway.enabled());
        assertEquals(tokenFile.toRealPath(), gateway.bearerTokenFile());

        Files.writeString(tokenFile, "short");
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeGatewayPolicy().resolve(properties));
    }

    @Test
    void rejectsUnsafeSecretPermissionsAndUnboundedTransportSettings() throws Exception {
        OtelRuntimeProperties properties = gatewayProperties();
        Path certificate = Files.writeString(tempDir.resolve("gateway.crt"), "certificate");
        Path privateKey = Files.writeString(tempDir.resolve("gateway.key"), "private-key");
        properties.setOtlpGatewayCertificateFile(certificate);
        properties.setOtlpGatewayPrivateKeyFile(privateKey);
        properties.setOtlpGatewayBearerToken("strong-inline-token");
        if (Files.getFileStore(privateKey).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(privateKey, Set.of(
                    PosixFilePermission.OWNER_READ,
                    PosixFilePermission.OWNER_WRITE,
                    PosixFilePermission.GROUP_READ));
            assertThrows(IllegalArgumentException.class,
                    () -> new OtelRuntimeGatewayPolicy().resolve(properties));
            OtelRuntimeConfigRenderer.setOwnerOnlyWhenSupported(privateKey);
        }

        properties.setOtlpReadTimeout(Duration.ofMillis(500));
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeGatewayPolicy().resolve(properties));
    }

    private OtelRuntimeProperties gatewayProperties() {
        OtelRuntimeProperties properties = properties();
        properties.setOtlpGatewayEnabled(true);
        properties.setOtlpGrpcEndpoint("0.0.0.0:4317");
        properties.setOtlpHttpEndpoint("0.0.0.0:4318");
        return properties;
    }

    private OtelRuntimeProperties properties() {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        return properties;
    }
}
