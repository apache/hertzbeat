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

package org.apache.hertzbeat.warehouse.db;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.web.client.RestTemplate;

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.INSTANT;
import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.RANGE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class PromqlQueryExecutorTest {

    static Stream<Arguments> queries() {
        return Stream.of("execute", INSTANT, RANGE).flatMap(operation -> Stream.of(
                "up", "sum(up{job=~\"api.+\",label=\"a&b=50%\",region=\"\u00e9\"}) + 1 - 2",
                "up{escaped=\"%2B%26%3D\"}").map(expression -> Arguments.of(operation, expression)));
    }

    @ParameterizedTest
    @MethodSource("queries")
    void sendsTheOriginalExpressionToTheHttpServer(String operation, String expression) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<Map<String, String>> received = new AtomicReference<>();
        AtomicReference<String> path = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        server.createContext("/api/v1/", exchange -> {
            path.set(exchange.getRequestURI().getPath());
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            received.set(Arrays.stream(exchange.getRequestURI().getRawQuery().split("&"))
                    .map(pair -> pair.split("=", 2))
                    .collect(Collectors.toMap(pair -> URLDecoder.decode(pair[0], StandardCharsets.UTF_8),
                            pair -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8))));
            String sample = RANGE.equals(operation) ? "\"values\":[[1712300000,\"7\"]]" : "\"value\":[1712300000,\"7\"]";
            byte[] body = ("{\"status\":\"success\",\"data\":{\"resultType\":\""
                    + (RANGE.equals(operation) ? "matrix" : "vector")
                    + "\",\"result\":[{\"metric\":{\"job\":\"fixture\"}," + sample + "}]}}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        server.start();
        try {
            PromqlQueryExecutor executor = new PromqlQueryExecutor(new RestTemplate(),
                    new PromqlQueryExecutor.HttpPromqlProperties("http://127.0.0.1:" + server.getAddress().getPort(),
                            "fixture-user", "fixture-password")) {
                @Override
                public String getDatasource() {
                    return "fixture";
                }
            };
            if ("execute".equals(operation)) {
                var result = executor.execute(expression);
                assertEquals(1, result.size());
                assertEquals("7", result.getFirst().get("__value__"));
            } else {
                var result = executor.query(DatasourceQuery.builder().refId("A").timeType(operation)
                        .expr(expression).start(1712300000L).end(1712300300L).step("60s").build());
                assertEquals(200, result.getStatus());
                assertEquals("A", result.getRefId());
                assertEquals(1, result.getFrames().size());
                assertEquals("7", result.getFrames().getFirst().getData().getFirst()[1]);
            }
            assertNotNull(received.get());
            assertEquals(expression, received.get().get("query"));
            assertEquals(RANGE.equals(operation) ? "/api/v1/query_range" : "/api/v1/query", path.get());
            assertEquals("Basic " + Base64.getEncoder().encodeToString(
                    "fixture-user:fixture-password".getBytes(StandardCharsets.UTF_8)), authorization.get());
            assertEquals(RANGE.equals(operation)
                    ? Map.of("query", expression, "start", "1712300000", "end", "1712300300", "step", "60s")
                    : Map.of("query", expression), received.get());
        } finally {
            server.stop(0);
        }
    }
}
