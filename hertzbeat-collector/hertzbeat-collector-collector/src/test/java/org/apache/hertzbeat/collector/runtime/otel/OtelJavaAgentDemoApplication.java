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

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Real application process used to prove official Java Agent instrumentation.
 */
public final class OtelJavaAgentDemoApplication {

    private static final Logger LOGGER = LoggerFactory.getLogger(OtelJavaAgentDemoApplication.class);

    private OtelJavaAgentDemoApplication() {
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(args[0]);
        CountDownLatch stopped = new CountDownLatch(1);
        prepareDatabase();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/inventory", OtelJavaAgentDemoApplication::inventory);
        server.createContext("/checkout", exchange -> checkout(exchange, port));
        server.createContext("/failure", OtelJavaAgentDemoApplication::failure);
        server.createContext("/stop", exchange -> stop(exchange, server, stopped));
        server.start();
        System.out.println("READY:" + port);
        stopped.await();
    }

    private static void prepareDatabase() throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:agent-demo;DB_CLOSE_DELAY=-1");
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE inventory (sku VARCHAR(32), quantity INT)");
            statement.execute("INSERT INTO inventory VALUES ('demo-sku', 7)");
        }
    }

    private static void checkout(HttpExchange exchange, int port) throws IOException {
        try {
            CompletableFuture<HttpResponse<String>> inventory = CompletableFuture.supplyAsync(() -> {
                try {
                    return HttpClient.newHttpClient().send(
                            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/inventory")).build(),
                            HttpResponse.BodyHandlers.ofString());
                } catch (IOException exception) {
                    throw new IllegalStateException(exception);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(exception);
                }
            });
            try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:agent-demo");
                 Statement statement = connection.createStatement()) {
                statement.executeQuery("SELECT quantity FROM inventory WHERE sku = 'demo-sku'");
            }
            if (inventory.join().statusCode() != 200) {
                throw new IllegalStateException("inventory request failed");
            }
            LOGGER.info("checkout-completed");
            respond(exchange, 200, "checkout-ok");
        } catch (RuntimeException | java.sql.SQLException exception) {
            respond(exchange, 500, "checkout-failed");
        }
    }

    private static void inventory(HttpExchange exchange) throws IOException {
        LOGGER.info("inventory-loaded");
        respond(exchange, 200, "inventory-ok");
    }

    private static void failure(HttpExchange exchange) throws IOException {
        LOGGER.warn("failure-requested");
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:agent-demo");
             Statement statement = connection.createStatement()) {
            statement.executeQuery("SELECT missing_column FROM missing_table");
        } catch (java.sql.SQLException exception) {
            respond(exchange, 500, "expected-failure");
            throw new IllegalStateException("agent-demo-exception", exception);
        }
    }

    private static void stop(HttpExchange exchange, HttpServer server, CountDownLatch stopped) throws IOException {
        respond(exchange, 200, "stopping");
        Thread.ofVirtual().start(() -> {
            server.stop(0);
            stopped.countDown();
        });
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        try (exchange) {
            exchange.sendResponseHeaders(status, payload.length);
            exchange.getResponseBody().write(payload);
        }
    }
}
