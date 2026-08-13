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

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.TelemetryStoreKind;
import org.junit.jupiter.api.Test;

class GreptimeHttpConnectionProbeTest {

    @Test
    void probeExecutesAuthenticatedBoundedSqlQueryAgainstSelectedDatabase() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        AtomicReference<String> observed = new AtomicReference<>();
        server.createContext("/v1/sql", exchange -> {
            observed.set(exchange.getRequestMethod() + " " + exchange.getRequestURI() + " "
                    + exchange.getRequestHeaders().getFirst("Authorization") + " "
                    + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.US_ASCII));
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        try {
            String endpoint = "http://" + InetAddress.getLoopbackAddress().getHostAddress()
                    + ":" + server.getAddress().getPort();
            TelemetryStoreConfiguration configuration = new TelemetryStoreConfiguration(
                    TelemetryStoreKind.GREPTIME, "localhost:4001", endpoint,
                    "public", "telemetry", "secret");

            assertThat(new GreptimeHttpConnectionProbe(Duration.ofSeconds(3)).probe(configuration)).isEmpty();
            assertThat(observed.get()).isEqualTo(
                    "POST /v1/sql?db=public Basic dGVsZW1ldHJ5OnNlY3JldA== sql=SELECT%201");
        } finally {
            server.stop(0);
        }
    }
}
