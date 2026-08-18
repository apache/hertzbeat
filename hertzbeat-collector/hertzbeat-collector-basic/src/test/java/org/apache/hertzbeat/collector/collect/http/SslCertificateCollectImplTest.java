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

package org.apache.hertzbeat.collector.collect.http;

import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsServer;
import java.io.FileInputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.util.List;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link SslCertificateCollectImpl}: real TLS handshake against a local
 * HTTPS server using a self-signed cert whose CN/SAN does not match the target address.
 */
class SslCertificateCollectImplTest {

    private static HttpsServer server;
    private static Path keystore;

    @BeforeAll
    static void startServer() throws Exception {
        keystore = genSelfSignedKeystore();
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(keystore.toFile())) {
            ks.load(in, "changeit".toCharArray());
        }
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(ks, "changeit".toCharArray());
        SSLContext ctx = SSLContext.getInstance("TLS");
        ctx.init(kmf.getKeyManagers(), null, null);
        server = HttpsServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setHttpsConfigurator(new HttpsConfigurator(ctx));
        server.createContext("/", exchange -> {
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
    }

    @AfterAll
    static void stopServer() throws Exception {
        if (server != null) {
            server.stop(0);
        }
        if (keystore != null) {
            Files.deleteIfExists(keystore);
        }
    }

    private static Path genSelfSignedKeystore() throws Exception {
        Path ks = Files.createTempFile("ssl-collect-test", ".p12");
        Files.delete(ks);
        String keytool = Path.of(System.getProperty("java.home"), "bin", "keytool").toString();
        int exit = new ProcessBuilder(keytool, "-genkeypair", "-alias", "test",
                "-keyalg", "RSA", "-keysize", "2048", "-storetype", "PKCS12",
                "-keystore", ks.toString(), "-storepass", "changeit",
                "-dname", "CN=test", "-ext", "SAN=dns:not-this-host", "-validity", "1")
                .inheritIO().start().waitFor();
        Assertions.assertEquals(0, exit, "keytool failed to generate test keystore");
        return ks;
    }

    private CollectRep.MetricsData.Builder collect(boolean verify) {
        HttpProtocol http = new HttpProtocol();
        http.setHost("127.0.0.1");
        http.setPort(String.valueOf(server.getAddress().getPort()));
        http.setSsl(String.valueOf(verify));
        Metrics metrics = Metrics.builder()
                .http(http)
                .aliasFields(List.of("subject", "expired", "end_timestamp"))
                .build();
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        new SslCertificateCollectImpl().collect(builder, metrics);
        return builder;
    }

    @Test
    void verifyOnFailsForUntrustedCert() {
        CollectRep.MetricsData.Builder builder = collect(true);
        Assertions.assertEquals(CollectRep.Code.UN_CONNECTABLE, builder.getCode(), builder.getMsg());
        Assertions.assertEquals(0, builder.getValuesCount());
    }

    @Test
    void verifyOffCollectsUntrustedMismatchedCert() {
        CollectRep.MetricsData.Builder builder = collect(false);
        Assertions.assertTrue(builder.getValuesCount() > 0, "expected cert rows, got: " + builder.getMsg());
        Assertions.assertEquals("CN=test", builder.getValues(0).getColumns(0));
    }
}
