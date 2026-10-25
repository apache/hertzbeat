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

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import org.apache.hertzbeat.collector.collect.http.HttpCollectImpl;
import org.apache.hertzbeat.collector.collect.nginx.NginxCollectImpl;
import org.apache.hertzbeat.collector.collect.prometheus.PrometheusAutoCollectImpl;
import org.apache.hertzbeat.collector.collect.prometheus.PrometheusProxyCollectImpl;
import org.apache.hertzbeat.collector.collect.redfish.RedfishClient;
import org.apache.hertzbeat.collector.collect.sd.HttpSdCollectImpl;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.NginxProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.PrometheusProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.RedfishProtocol;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.methods.Configurable;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.impl.client.BasicCookieStore;
import org.apache.http.util.EntityUtils;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CollectorCookiePolicyTest {

    static Stream<Arguments> requests() {
        return Stream.of("http", "nginx", "prometheus-auto", "prometheus-proxy", "http-sd")
                .flatMap(collector -> Stream.of(0, 3000).flatMap(timeout -> Stream.of(false, true)
                        .map(redirect -> Arguments.of(collector, timeout, redirect))));
    }

    @ParameterizedTest(name = "{0}, timeout={1}, redirect={2}")
    @MethodSource("requests")
    void requestBuildersRetainCookiesAcrossRequestsAndRedirects(String collector, int timeout, boolean redirect) throws Exception {
        try (CookieServer server = new CookieServer(redirect, false)) {
            HttpClientContext context = HttpClientContext.create();
            context.setCookieStore(new BasicCookieStore());
            HttpUriRequest request = request(collector, server.port(), "/set", timeout);
            execute(request, context);
            if (!redirect) execute(request(collector, server.port(), "/read", timeout), context);

            server.assertCookies();
            var config = ((Configurable) request).getConfig();
            if (config != null) {
                assertEquals(CookieSpecs.STANDARD, config.getCookieSpec());
                assertTrue(config.isRedirectsEnabled());
                if (timeout > 0) {
                    assertEquals(timeout, config.getConnectTimeout());
                    assertEquals(timeout, config.getSocketTimeout());
                }
            }
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 3000})
    void redfishSessionRequestRetainsCookieOnRedirect(int timeout) throws Exception {
        try (CookieServer server = new CookieServer(true, true)) {
            RedfishClient client = RedfishClient.create(RedfishProtocol.builder().host("http://127.0.0.1")
                    .port(String.valueOf(server.port())).username("fixture-user").password("fixture-password")
                    .timeout(String.valueOf(timeout)).build());
            assertNotNull(client.connect());
            server.assertCookies();
        }
    }

    private HttpUriRequest request(String collector, int port, String path, int timeout) throws Exception {
        HttpProtocol http = HttpProtocol.builder().host("127.0.0.1").port(String.valueOf(port)).url(path)
                .method("GET").timeout(String.valueOf(timeout)).ssl("false").build();
        return switch (collector) {
            case "http" -> new HttpCollectImpl().createHttpRequest(http);
            case "http-sd" -> {
                http.setUrl("http://127.0.0.1:" + port + path);
                yield new HttpSdCollectImpl().createHttpRequest(http);
            }
            case "nginx" -> {
                Method create = NginxCollectImpl.class.getDeclaredMethod("createHttpRequest", NginxProtocol.class);
                create.setAccessible(true);
                yield (HttpUriRequest) create.invoke(new NginxCollectImpl(), NginxProtocol.builder()
                        .host("127.0.0.1").port(String.valueOf(port)).url(path).timeout(String.valueOf(timeout)).ssl("false").build());
            }
            default -> {
                PrometheusProtocol protocol = PrometheusProtocol.builder().host("127.0.0.1")
                        .port(String.valueOf(port)).path(path).method("GET").timeout(String.valueOf(timeout)).ssl("false").build();
                yield collector.equals("prometheus-auto")
                        ? PrometheusAutoCollectImpl.getInstance().createHttpRequest(protocol)
                        : PrometheusProxyCollectImpl.getInstance().createHttpRequest(protocol);
            }
        };
    }

    private void execute(HttpUriRequest request, HttpClientContext context) throws IOException {
        try (var response = CommonHttpClient.getHttpClient().execute(request, context)) {
            assertEquals(200, response.getStatusLine().getStatusCode());
            EntityUtils.consume(response.getEntity());
        }
    }

    private static final class CookieServer implements AutoCloseable {
        private final HttpServer server;
        private final AtomicReference<String> cookie = new AtomicReference<>();
        private final boolean redfish;

        private CookieServer(boolean redirect, boolean redfish) throws IOException {
            this.redfish = redfish;
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/set", exchange -> setCookie(exchange, redirect));
            server.createContext(RedfishClient.REDFISH_SESSION_SERVICE, exchange -> setCookie(exchange, true));
            server.createContext("/read", exchange -> {
                cookie.set(exchange.getRequestHeaders().getFirst("Cookie"));
                if (redfish) {
                    exchange.getResponseHeaders().set("Location", "/fixture-session");
                    exchange.getResponseHeaders().set("X-Auth-Token", "fixture-session-token");
                    exchange.getResponseHeaders().add("Set-Cookie", "plain=; Max-Age=0; Path=/");
                    exchange.getResponseHeaders().add("Set-Cookie", "tenant=; Max-Age=0; Path=/");
                }
                exchange.sendResponseHeaders(redfish ? 201 : 200, -1);
                exchange.close();
            });
            server.start();
        }

        private void setCookie(HttpExchange exchange, boolean redirect) throws IOException {
            exchange.getRequestBody().close();
            // Redfish owns its context; delete the fixture cookies on the redirected response below.
            exchange.getResponseHeaders().add("Set-Cookie", "plain=value; Path=/");
            exchange.getResponseHeaders().add("Set-Cookie", "tenant=fixture; Expires=Thu, 31 Dec 2099 23:59:59 GMT; Path=/");
            exchange.getResponseHeaders().add("Set-Cookie", "expired=old; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/");
            if (redirect) exchange.getResponseHeaders().set("Location", "/read");
            exchange.sendResponseHeaders(redirect ? (redfish ? 303 : 302) : 200, -1);
            exchange.close();
        }

        private int port() {
            return server.getAddress().getPort();
        }

        private void assertCookies() {
            assertNotNull(cookie.get());
            assertTrue(cookie.get().contains("plain=value"), cookie.get());
            assertTrue(cookie.get().contains("tenant=fixture"), cookie.get());
            assertFalse(cookie.get().contains("expired=old"), cookie.get());
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }
}
