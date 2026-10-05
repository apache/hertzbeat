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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.apache.http.client.CookieStore;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.cookie.Cookie;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.util.EntityUtils;
import org.junit.jupiter.api.Test;

/**
 * Tests for the cookie policy used by {@link CommonHttpClient}.
 */
class CommonHttpClientCookieSpecTest {

    @Test
    void parsesCookieWithRfc1123ExpiresDate() throws Exception {
        InetAddress loopback = InetAddress.getByName("127.0.0.1");
        try (ServerSocket serverSocket = new ServerSocket(0, 1, loopback);
             ExecutorService serverExecutor = Executors.newSingleThreadExecutor()) {
            Future<?> responseSent = serverExecutor.submit(() -> sendCookieResponse(serverSocket));
            CookieStore cookieStore = new BasicCookieStore();
            HttpClientContext context = HttpClientContext.create();
            context.setCookieStore(cookieStore);
            HttpGet request = new HttpGet("http://" + loopback.getHostAddress() + ":" + serverSocket.getLocalPort());

            try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, context)) {
                assertEquals(200, response.getStatusLine().getStatusCode());
                EntityUtils.consume(response.getEntity());
            }
            responseSent.get(5, TimeUnit.SECONDS);

            List<Cookie> cookies = cookieStore.getCookies();
            assertEquals(1, cookies.size());
            assertEquals("__tenant", cookies.getFirst().getName());
            assertEquals("tenant-id", cookies.getFirst().getValue());
        }
    }

    private static void sendCookieResponse(ServerSocket serverSocket) {
        try (Socket socket = serverSocket.accept();
             BufferedReader reader = new BufferedReader(
                     new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
             OutputStream output = socket.getOutputStream()) {
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                // Consume the request headers before sending the response.
            }
            String response = "HTTP/1.1 200 OK\r\n"
                    + "Content-Length: 2\r\n"
                    + "Set-Cookie: __tenant=tenant-id; expires=Thu, 31 Dec 2099 23:59:59 GMT; path=/\r\n"
                    + "Connection: close\r\n"
                    + "\r\n"
                    + "OK";
            output.write(response.getBytes(StandardCharsets.US_ASCII));
            output.flush();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to serve the cookie test response", exception);
        }
    }
}
