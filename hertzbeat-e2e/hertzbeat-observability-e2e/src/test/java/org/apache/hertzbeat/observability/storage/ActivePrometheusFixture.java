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

package org.apache.hertzbeat.observability.storage;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** Real scrape endpoint used by the active-source E2E data path. */
final class ActivePrometheusFixture implements AutoCloseable {

    private static final byte[] BODY = ("""
            # TYPE target_info gauge
            {"target_info","service.namespace"="%s"} 1
            # TYPE %s gauge
            {"%s","http.route"="%s"} 7
            # EOF
            """.formatted(
            GreptimeThreeSignalE2eSupport.SERVICE_NAMESPACE,
            GreptimeThreeSignalE2eSupport.METRIC_QUERY,
            GreptimeThreeSignalE2eSupport.METRIC_QUERY,
            GreptimeThreeSignalE2eSupport.ENDPOINT)).getBytes(StandardCharsets.UTF_8);

    private final AtomicInteger requestCount = new AtomicInteger();
    private HttpServer server;

    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/metrics", this::serveMetrics);
        server.setExecutor(Executors.newSingleThreadExecutor(Thread.ofPlatform()
                .daemon()
                .name("active-prometheus-fixture")
                .factory()));
        server.start();
    }

    int port() {
        return server.getAddress().getPort();
    }

    int requestCount() {
        return requestCount.get();
    }

    private void serveMetrics(HttpExchange exchange) throws IOException {
        requestCount.incrementAndGet();
        exchange.getResponseHeaders().set(
                "Content-Type", "application/openmetrics-text; version=1.0.0; charset=utf-8; escaping=allow-utf-8");
        exchange.sendResponseHeaders(200, BODY.length);
        exchange.getResponseBody().write(BODY);
        exchange.close();
    }

    @Override
    public void close() {
        if (server != null) {
            server.stop(0);
        }
    }
}
