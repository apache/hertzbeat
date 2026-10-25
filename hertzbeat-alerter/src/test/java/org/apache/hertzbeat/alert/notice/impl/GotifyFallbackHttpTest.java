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

package org.apache.hertzbeat.alert.notice.impl;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.ListResourceBundle;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Real handler/template/client HTTP round trips; the example default host is rerouted only by the test transport. */
class GotifyFallbackHttpTest {

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void defaultAndConfiguredTemplatesSendTheReceiverToken(boolean configured) throws Exception {
        exchange(configured, 200);
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 500})
    void serverRejectionIsReported(int status) throws Exception {
        exchange(true, status);
    }

    private void exchange(boolean configured, int status) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> query = new AtomicReference<>();
        AtomicReference<String> body = new AtomicReference<>();
        AtomicReference<URI> requested = new AtomicReference<>();
        server.createContext("/message", request -> {
            query.set(request.getRequestURI().getRawQuery());
            body.set(new String(request.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            int response = "token=fixture-token".equals(query.get()) ? status : 401;
            byte[] bytes = "{}".getBytes(StandardCharsets.UTF_8);
            request.getResponseHeaders().set("Content-Type", "application/json");
            request.sendResponseHeaders(response, bytes.length);
            try (var output = request.getResponseBody()) {
                output.write(bytes);
            }
        });
        server.start();
        try {
            String local = "http://127.0.0.1:" + server.getAddress().getPort();
            AlerterProperties properties = new AlerterProperties();
            if (configured) {
                properties.setGotifyWebhookUrl(local + "/message?token=%s");
            }
            SimpleClientHttpRequestFactory transport = new SimpleClientHttpRequestFactory() {
                @Override
                public ClientHttpRequest createRequest(URI uri, HttpMethod method) throws IOException {
                    requested.set(uri);
                    // Preserve the production URI/path/query; never resolve or contact the example domain.
                    URI destination = configured ? uri : URI.create(local + uri.getRawPath() + "?" + uri.getRawQuery());
                    return super.createRequest(destination, method);
                }
            };
            transport.setConnectTimeout(2000);
            transport.setReadTimeout(2000);
            GotifyAlertNotifyHandlerImpl handler = new GotifyAlertNotifyHandlerImpl();
            handler.alerterProperties = properties;
            handler.restTemplate = new RestTemplate(transport);
            handler.bundle = new ListResourceBundle() {
                @Override
                protected Object[][] getContents() {
                    return new Object[][]{{"alerter.notify.title", "Fixture title"}};
                }
            };
            NoticeReceiver receiver = new NoticeReceiver();
            receiver.setGotifyToken("fixture-token");
            NoticeTemplate template = new NoticeTemplate();
            template.setContent("fixture-message");
            GroupAlert alert = new GroupAlert();
            alert.setAlerts(List.of());
            if (status == 200) {
                assertDoesNotThrow(() -> handler.send(receiver, template, alert));
            } else {
                assertThrows(AlertNoticeException.class, () -> handler.send(receiver, template, alert));
            }
            assertEquals("token=fixture-token", query.get());
            assertTrue(body.get().contains("fixture-message"));
            assertTrue(body.get().contains("Fixture title"));
            if (!configured) {
                assertEquals("https://push.example.de/message?token=fixture-token", requested.get().toString());
            }
        } finally {
            server.stop(0);
        }
    }
}
