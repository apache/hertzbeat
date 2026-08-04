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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

class RestTemplateConfigTest {

    @Test
    void greptimeQueryRestTemplateAllowsColdQueryToComplete() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/query", exchange -> {
            try {
                Thread.sleep(5_500);
                byte[] response = "ok".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();

        try {
            RestTemplateConfig config = new RestTemplateConfig();
            RestTemplate restTemplate = config.greptimeQueryRestTemplate(
                    config.greptimeQueryClientHttpRequestFactory());

            String response = restTemplate.getForObject(
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/query", String.class);

            assertEquals("ok", response);
        } finally {
            server.stop(0);
        }
    }
}
