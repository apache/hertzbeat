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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import com.sun.net.httpserver.HttpServer;
import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.methods.Configurable;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.util.EntityUtils;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NebulaGraphCookiePolicyTest {

    @ParameterizedTest
    @CsvSource({"0,false", "0,true", "3000,false", "3000,true"})
    void requestBuilderRetainsCookiesAcrossRequestsAndRedirects(int timeout, boolean redirect) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> cookie = new AtomicReference<>();
        server.createContext("/set", exchange -> {
            exchange.getResponseHeaders().add("Set-Cookie", "plain=value; Path=/");
            exchange.getResponseHeaders().add("Set-Cookie", "tenant=fixture; Expires=Thu, 31 Dec 2099 23:59:59 GMT; Path=/");
            exchange.getResponseHeaders().add("Set-Cookie", "expired=old; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/");
            if (redirect) exchange.getResponseHeaders().set("Location", "/read");
            exchange.sendResponseHeaders(redirect ? 302 : 200, -1);
            exchange.close();
        });
        server.createContext("/read", exchange -> {
            cookie.set(exchange.getRequestHeaders().getFirst("Cookie"));
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        try {
            HttpClientContext context = HttpClientContext.create();
            context.setCookieStore(new BasicCookieStore());
            HttpUriRequest request = request(server.getAddress().getPort(), "/set", timeout);
            execute(request, context);
            if (!redirect) execute(request(server.getAddress().getPort(), "/read", timeout), context);
            assertNotNull(cookie.get());
            assertTrue(cookie.get().contains("plain=value"));
            assertTrue(cookie.get().contains("tenant=fixture"), cookie.get());
            assertFalse(cookie.get().contains("expired=old"));
            if (timeout > 0) {
                var config = ((Configurable) request).getConfig();
                assertEquals(timeout, config.getConnectTimeout());
                assertEquals(timeout, config.getSocketTimeout());
                assertEquals(CookieSpecs.STANDARD, config.getCookieSpec());
                assertTrue(config.isRedirectsEnabled());
            }
        } finally {
            server.stop(0);
        }
    }

    private HttpUriRequest request(int port, String path, int timeout) throws Exception {
        Method create = NebulaGraphCollectImpl.class.getDeclaredMethod("createHttpRequest",
                String.class, String.class, String.class, String.class);
        create.setAccessible(true);
        return (HttpUriRequest) create.invoke(new NebulaGraphCollectImpl(), "127.0.0.1", String.valueOf(port), path, String.valueOf(timeout));
    }

    private void execute(HttpUriRequest request, HttpClientContext context) throws Exception {
        try (var response = CommonHttpClient.getHttpClient().execute(request, context)) {
            assertEquals(200, response.getStatusLine().getStatusCode());
            EntityUtils.consume(response.getEntity());
        }
    }
}
