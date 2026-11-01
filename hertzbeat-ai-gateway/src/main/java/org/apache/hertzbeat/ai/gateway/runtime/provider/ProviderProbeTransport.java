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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import javax.net.ssl.SSLException;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Category;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

/** One bounded, non-streaming synthetic request. System DNS/proxy defaults; no tools, redirects, fallback or raw-response exposure. */
@Component
public class ProviderProbeTransport {
    public static final String SYNTHETIC_INPUT = "Reply with READY. This is a connection test.";
    private static final int MAX_RESPONSE_BYTES = 8192;

    public Outcome execute(ProviderProbeDestinationPolicy.Destination destination, String protocol,
                           String model, String key, Consumer<Call> register) {
        var client = new OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
                .retryOnConnectionFailure(false).connectTimeout(Duration.ofSeconds(3)).callTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(10)).build();
        Map<String, Object> payload = "responses".equals(protocol)
                ? Map.of("model", model, "input", SYNTHETIC_INPUT, "stream", false, "max_output_tokens", 32, "store", false)
                : Map.of("model", model, "messages", List.of(Map.of("role", "user", "content", SYNTHETIC_INPUT)),
                        "stream", false, "max_completion_tokens", 32);
        var request = new Request.Builder().url(destination.endpoint().toString())
                .post(RequestBody.create(JsonUtil.toJson(payload), MediaType.get("application/json")))
                .header("Accept", "application/json");
        if (StringUtils.hasText(key)) {
            request.header("Authorization", "Bearer " + key);
        }
        Call call = client.newCall(request.build());
        register.accept(call);
        try (var response = call.execute()) {
            byte[] bytes = response.body() == null ? new byte[0] : response.body().byteStream().readNBytes(MAX_RESPONSE_BYTES + 1);
            if (bytes.length > MAX_RESPONSE_BYTES) {
                return new Outcome(Category.PROTOCOL, response.code());
            }
            JsonNode data = JsonUtil.fromJsonQuietly(new String(bytes, java.nio.charset.StandardCharsets.UTF_8));
            if (!response.isSuccessful()) {
                return new Outcome(classify(response.code(), data), response.code());
            }
            return new Outcome(validText(protocol, data) ? Category.OK : Category.PROTOCOL, response.code());
        } catch (SSLException failure) {
            return new Outcome(Category.TLS, null);
        } catch (InterruptedIOException timeout) {
            return new Outcome(Category.TIMEOUT, null);
        } catch (IOException failure) {
            return new Outcome(Category.NETWORK, null);
        } finally {
            client.connectionPool().evictAll();
            client.dispatcher().executorService().shutdown();
        }
    }

    private boolean validText(String protocol, JsonNode data) {
        if (data == null || data.hasNonNull("error")) return false;
        if ("responses".equals(protocol) && data.hasNonNull("status")
                && !"completed".equals(data.path("status").asText())) return false;
        if (!"responses".equals(protocol)) {
            return data.path("choices").path(0).path("message").path("content").isTextual()
                    && !data.path("choices").path(0).path("message").path("content").asText().isBlank();
        }
        for (var item : data.path("output")) {
            for (var content : item.path("content")) {
                if ("output_text".equals(content.path("type").asText()) && content.path("text").isTextual()
                        && !content.path("text").asText().isBlank()) return true;
            }
        }
        return false;
    }

    private Category classify(int status, JsonNode data) {
        String code = data == null ? "" : data.path("error").path("code").asText("");
        if (status == 401 || status == 403) return Category.AUTHENTICATION;
        if (List.of("model_not_found", "invalid_model", "unknown_model").contains(code)) return Category.MODEL;
        if (List.of("unsupported_protocol", "unsupported_endpoint", "unsupported_parameter").contains(code)
                || status == 405 || status == 415 || status == 501) return Category.PROTOCOL;
        if (status >= 300 && status < 400 || status == 404) return Category.ADDRESS_PATH;
        if (status == 429) return Category.RATE_LIMIT;
        if (status >= 500) return Category.UPSTREAM;
        return Category.PROTOCOL;
    }

    /** Transport result without upstream content. */
    public record Outcome(Category category, Integer httpStatus) { }
}
