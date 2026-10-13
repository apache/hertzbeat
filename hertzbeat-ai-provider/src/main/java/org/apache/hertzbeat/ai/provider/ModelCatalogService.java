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

package org.apache.hertzbeat.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/** Reads bounded model catalogs without persisting the draft or calling inference. */
@Service
public class ModelCatalogService {
    private static final int MAX_MODELS = 1000;
    private static final int MAX_PAGES = 10;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();

    public Result list(ModelProviderConfig input) {
        ModelProviderConfig config = input.copy();
        config.setModel("model-discovery");
        if (!StringUtils.hasText(config.getName())) config.setName("Model discovery");
        try {
            config = ModelConnection.validate(config);
        } catch (IllegalArgumentException exception) {
            return failure("invalid-input");
        }
        String endpoint = catalogEndpoint(config);
        long deadline = System.nanoTime() + Duration.ofSeconds(15).toNanos();
        LinkedHashMap<String, Model> models = new LinkedHashMap<>();
        Set<String> cursors = new HashSet<>();
        String cursor = null;
        for (int page = 0; page < MAX_PAGES; page++) {
            HttpResponse<byte[]> response;
            try {
                response = fetch(config, endpoint, cursor, deadline);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return failure("unavailable");
            } catch (Exception exception) {
                return failure("unavailable");
            }
            int status = response.statusCode();
            if (status == 401 || status == 403) return failure("authentication-failed");
            if (status == 404 || status == 405 || status == 501) return failure("unsupported");
            if (status < 200 || status >= 300) return failure("unavailable");
            JsonNode root;
            try {
                root = JSON.readTree(response.body());
                if (root == null || !root.path("data").isArray())
                    return failure("invalid-response");
                for (JsonNode item : root.path("data")) {
                    if (!item.path("id").isTextual() || item.path("id").asText().isBlank())
                        return failure("invalid-response");
                    String id = item.path("id").asText();
                    if (id.length() > 512) return failure("invalid-response");
                    if (models.size() == MAX_MODELS && !models.containsKey(id))
                        return ready(models, true);
                    String name =
                            item.path("display_name").isTextual()
                                    ? item.path("display_name").asText()
                                    : id;
                    models.putIfAbsent(id, new Model(id, name.isBlank() ? id : name));
                }
            } catch (Exception exception) {
                return failure("invalid-response");
            }
            if (!root.path("has_more").asBoolean(false)) return ready(models, false);
            if (!root.path("last_id").isTextual()
                    || root.path("last_id").asText().isBlank()
                    || !cursors.add(root.path("last_id").asText()))
                return failure("invalid-response");
            cursor = root.path("last_id").asText();
        }
        return ready(models, true);
    }

    private HttpResponse<byte[]> fetch(
            ModelProviderConfig config, String endpoint, String cursor, long deadline)
            throws Exception {
        String query =
                ModelConnection.protocol(config).equals("anthropic-messages") ? "?limit=100" : "";
        if (cursor != null)
            query +=
                    (query.isEmpty() ? "?" : "&")
                            + "after_id="
                            + URLEncoder.encode(cursor, StandardCharsets.UTF_8);
        HttpRequest.Builder request =
                HttpRequest.newBuilder(URI.create(endpoint + query))
                        .GET()
                        .timeout(Duration.ofSeconds(15))
                        .header("Accept", "application/json");
        if (ModelConnection.protocol(config).equals("anthropic-messages"))
            request.header("anthropic-version", "2023-06-01");
        if (ModelConnection.authMode(config).equals("default")) {
            boolean anthropic = ModelConnection.protocol(config).equals("anthropic-messages");
            request.header(
                    anthropic ? "x-api-key" : "Authorization",
                    anthropic ? config.getApiKey() : "Bearer " + config.getApiKey());
        }
        if (config.getHeaders() != null) config.getHeaders().forEach(request::setHeader);
        var pending =
                HTTP.sendAsync(
                        request.build(),
                        HttpResponse.BodyHandlers.limiting(
                                HttpResponse.BodyHandlers.ofByteArray(), 2 * 1024 * 1024));
        try {
            return pending.get(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
        } finally {
            if (!pending.isDone()) pending.cancel(true);
        }
    }

    private String catalogEndpoint(ModelProviderConfig config) {
        String endpoint = ModelConnection.endpoint(config);
        String suffix = switch (ModelConnection.protocol(config)) {
            case "openai-responses" -> "/responses";
            case "anthropic-messages" -> "/messages";
            default -> "/chat/completions";
        };
        return endpoint.substring(0, endpoint.length() - suffix.length()) + "/models";
    }

    private Result ready(LinkedHashMap<String, Model> models, boolean truncated) {
        return new Result("ready", List.copyOf(models.values()), truncated);
    }

    private Result failure(String status) {
        return new Result(status, List.of(), false);
    }

    /** Model IDs remain selectable even when no display name is supplied. */
    public record Model(String id, String name) {}

    /** Safe discovery outcome; upstream response bodies and credentials are never returned. */
    public record Result(String status, List<Model> models, boolean truncated) {}
}
