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

package org.apache.hertzbeat.collector.collect.redfish;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.apache.http.HttpStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link RedfishConnectSession}
 */
public class RedfishConnectSessionTest {

    private static final String SESSION_LOCATION = "/redfish/v1/SessionService/Sessions/1";

    private HttpServer server;

    private int responseStatus = HttpStatus.SC_OK;

    private final List<String> receivedRequests = new CopyOnWriteArrayList<>();

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            receivedRequests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath());
            if (responseStatus == HttpStatus.SC_NO_CONTENT) {
                exchange.sendResponseHeaders(HttpStatus.SC_NO_CONTENT, -1);
                exchange.close();
                return;
            }
            byte[] body = "{\"Id\":\"1\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(responseStatus, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private RedfishConnectSession session() {
        return session(SESSION_LOCATION);
    }

    private RedfishConnectSession session(String location) {
        return new RedfishConnectSession(
                new Session("token", location, "http://127.0.0.1", server.getAddress().getPort()));
    }

    @Test
    void closeDeletesSessionAtItsLocation() throws Exception {
        RedfishConnectSession connectSession = session();

        connectSession.close();

        assertEquals(List.of("DELETE " + SESSION_LOCATION), receivedRequests);
        assertFalse(connectSession.isOpen());
    }

    @Test
    void closeAcceptsNoContentResponse() throws Exception {
        responseStatus = HttpStatus.SC_NO_CONTENT;

        session().close();

        assertEquals(List.of("DELETE " + SESSION_LOCATION), receivedRequests);
    }

    @Test
    void closeAcceptsAcceptedResponse() throws Exception {
        responseStatus = HttpStatus.SC_ACCEPTED;

        session().close();

        assertEquals(List.of("DELETE " + SESSION_LOCATION), receivedRequests);
    }

    @Test
    void closeAcceptsSameOriginAbsoluteLocation() throws Exception {
        String location = "http://127.0.0.1:" + server.getAddress().getPort() + SESSION_LOCATION;

        session(location).close();

        assertEquals(List.of("DELETE " + SESSION_LOCATION), receivedRequests);
    }

    @Test
    void closeRejectsCrossOriginLocation() {
        RedfishConnectSession connectSession = session("https://example.com" + SESSION_LOCATION);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, connectSession::close);

        assertTrue(error.getMessage().contains("monitored endpoint"));
        assertTrue(receivedRequests.isEmpty());
    }

    @Test
    void getRedfishResourceRequestsGivenUri() throws Exception {
        String resource = session().getRedfishResource("/redfish/v1/Chassis/1U/");

        assertEquals("{\"Id\":\"1\"}", resource);
        assertEquals(List.of("GET /redfish/v1/Chassis/1U"), receivedRequests);
    }

    @Test
    void getRedfishResourceRejectsSchemeDowngrade() {
        String uri = "https://127.0.0.1:" + server.getAddress().getPort() + "/redfish/v1/Chassis/1U";

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class, () -> session().getRedfishResource(uri));

        assertTrue(error.getMessage().contains("monitored endpoint"));
        assertTrue(receivedRequests.isEmpty());
    }
}
