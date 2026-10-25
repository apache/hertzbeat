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

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.util.EntityUtils;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CommonHttpClientCookieSpecTest {

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void sendsAcceptedCookiesOnTheNextRequest(boolean rfc1123Expiry) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> receivedCookie = new AtomicReference<>();
        server.createContext("/set", exchange -> {
            exchange.getResponseHeaders().add("Set-Cookie", "plain=value; Path=/");
            exchange.getResponseHeaders().add("Set-Cookie", "expired=old; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/");
            if (rfc1123Expiry) {
                exchange.getResponseHeaders().add("Set-Cookie",
                        "__tenant=tenant-id; Expires=Thu, 31 Dec 2099 23:59:59 GMT; Path=/");
            }
            byte[] body = "OK".getBytes(StandardCharsets.US_ASCII);
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        server.createContext("/read", exchange -> {
            receivedCookie.set(exchange.getRequestHeaders().getFirst("Cookie"));
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();
        try {
            String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
            HttpClientContext context = HttpClientContext.create();
            context.setCookieStore(new BasicCookieStore());
            try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(new HttpGet(baseUrl + "/set"), context)) {
                assertEquals(200, response.getStatusLine().getStatusCode());
                EntityUtils.consume(response.getEntity());
            }
            try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(new HttpGet(baseUrl + "/read"), context)) {
                assertEquals(204, response.getStatusLine().getStatusCode());
                EntityUtils.consume(response.getEntity());
            }
            String cookie = receivedCookie.get();
            assertNotNull(cookie);
            assertTrue(cookie.contains("plain=value"));
            assertFalse(cookie.contains("expired=old"));
            assertEquals(rfc1123Expiry, cookie.contains("__tenant=tenant-id"));
        } finally {
            server.stop(0);
        }
    }
}
