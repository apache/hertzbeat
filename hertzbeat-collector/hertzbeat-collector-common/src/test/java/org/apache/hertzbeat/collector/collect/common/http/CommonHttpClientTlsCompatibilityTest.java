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

package org.apache.hertzbeat.collector.collect.common.http;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsParameters;
import com.sun.net.httpserver.HttpsServer;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.util.EntityUtils;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CommonHttpClientTlsCompatibilityTest {
    @TempDir
    static Path directory;
    private static SSLContext context;

    @BeforeAll
    static void createSyntheticCertificate() throws Exception {
        Path store = directory.resolve("fixture.p12");
        Path log = directory.resolve("keytool.log");
        Process process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "keytool").toString(),
                "-genkeypair", "-alias", "fixture", "-keyalg", "RSA", "-keysize", "2048", "-validity", "2",
                "-dname", "CN=localhost", "-ext", "SAN=ip:127.0.0.1", "-storetype", "PKCS12",
                "-keystore", store.toString(), "-storepass", "synthetic-fixture-only", "-noprompt")
                .redirectErrorStream(true).redirectOutput(log.toFile()).start();
        try {
            assertTrue(process.waitFor(20, TimeUnit.SECONDS), "fixture certificate generation timeout");
            assertEquals(0, process.exitValue(), Files.readString(log));
        } finally {
            if (process.isAlive()) {
                process.destroyForcibly();
            }
        }
        KeyStore keys = KeyStore.getInstance("PKCS12");
        try (var input = Files.newInputStream(store)) {
            keys.load(input, "synthetic-fixture-only".toCharArray());
        }
        KeyManagerFactory manager = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        manager.init(keys, "synthetic-fixture-only".toCharArray());
        context = SSLContext.getInstance("TLS");
        context.init(manager.getKeyManagers(), null, null);
    }

    @Test
    void connectsToTls12OnlyServer() throws Exception {
        exchange("TLSv1.2");
    }

    @Test
    void connectsToTls13OnlyServer() throws Exception {
        exchange("TLSv1.3");
    }

    @Test
    void preservesExistingConfiguredProtocolNames() throws Exception {
        var field = CommonHttpClient.class.getDeclaredField("SUPPORTED_SSL");
        field.setAccessible(true);
        var protocols = Arrays.asList((String[]) field.get(null));
        assertTrue(protocols.containsAll(Arrays.asList("TLSv1", "TLSv1.1", "TLSv1.2", "SSLv3")));
    }

    private void exchange(String protocol) throws Exception {
        HttpsServer server = HttpsServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setHttpsConfigurator(new HttpsConfigurator(context) {
            @Override
            public void configure(HttpsParameters parameters) {
                var sslParameters = context.getDefaultSSLParameters();
                sslParameters.setProtocols(new String[]{protocol});
                parameters.setSSLParameters(sslParameters);
            }
        });
        server.createContext("/", exchange -> {
            byte[] body = "fixture-ok".getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        server.start();
        try {
            HttpGet request = new HttpGet("https://127.0.0.1:" + server.getAddress().getPort() + "/");
            request.setConfig(RequestConfig.custom().setConnectTimeout(2000).setSocketTimeout(2000).build());
            try (var response = CommonHttpClient.getHttpClient().execute(request)) {
                assertEquals(200, response.getStatusLine().getStatusCode());
                assertEquals("fixture-ok", EntityUtils.toString(response.getEntity()));
            }
        } finally {
            server.stop(0);
        }
    }

    @AfterAll
    static void closeOwnedClient() {
        CommonHttpClient.close();
    }
}
