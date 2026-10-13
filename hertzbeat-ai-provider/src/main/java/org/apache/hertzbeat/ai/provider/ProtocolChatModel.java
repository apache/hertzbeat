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

import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionResult;

import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;
import reactor.core.scheduler.Schedulers;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/** Cancellable SSE transport with protocol mapping and optional legacy tool execution. */
public class ProtocolChatModel implements ChatModel {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();
    private final ModelProviderConfig config;
    private final boolean executeTools;
    private final ToolCallingManager tools = ToolCallingManager.builder().build();

    ProtocolChatModel(ModelProviderConfig config, boolean executeTools) {
        this.config = config;
        this.executeTools = executeTools;
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        List<ChatResponse> responses = stream(prompt).collectList().block();
        StringBuilder text = new StringBuilder();
        ChatResponse last = null;
        for (ChatResponse response : responses) {
            last = response;
            if (response.getResult() != null)
                text.append(response.getResult().getOutput().getText());
        }
        if (last == null) throw new ModelProviderException("Provider returned no response", true);
        AssistantMessage assistant =
                last.getResult().getOutput().mutate().content(text.toString()).build();
        return new ChatResponse(List.of(new Generation(assistant)), last.getMetadata());
    }

    @Override
    public Flux<ChatResponse> stream(Prompt prompt) {
        return Flux.<ChatResponse>create(
                        sink -> {
                            AtomicReference<InputStream> input = new AtomicReference<>();
                            AtomicReference<java.util.concurrent.CompletableFuture<?>> pending =
                                    new AtomicReference<>();
                            sink.onCancel(
                                    () -> {
                                        var future = pending.get();
                                        if (future != null) future.cancel(true);
                                        close(input.get());
                                    });
                            try {
                                Prompt current = prompt;
                                for (int turn = 0; turn < 16 && !sink.isCancelled(); turn++) {
                                    ChatResponse result = request(current, sink, input, pending);
                                    if (sink.isCancelled()) return;
                                    if (!executeTools || !result.hasToolCalls()) {
                                        sink.next(
                                                new ChatResponse(
                                                        List.of(
                                                                new Generation(
                                                                        result.getResult()
                                                                                .getOutput()
                                                                                .mutate()
                                                                                .content("")
                                                                                .build())),
                                                        result.getMetadata()));
                                        sink.complete();
                                        return;
                                    }
                                    ToolExecutionResult execution =
                                            tools.executeToolCalls(current, result);
                                    if (execution.returnDirect()) {
                                        sink.next(
                                                new ChatResponse(
                                                        ToolExecutionResult.buildGenerations(
                                                                execution)));
                                        sink.complete();
                                        return;
                                    }
                                    current =
                                            new Prompt(
                                                    execution.conversationHistory(),
                                                    current.getOptions());
                                }
                                if (!sink.isCancelled())
                                    sink.error(
                                            new ModelProviderException(
                                                    "Model tool turn limit exceeded", false));
                            } catch (Exception exception) {
                                if (!sink.isCancelled())
                                    sink.error(
                                            exception instanceof ModelProviderException
                                                    ? exception
                                                    : new ModelProviderException(
                                                            "Model request failed (connection,"
                                                                + " timeout or invalid response)",
                                                            true));
                            } finally {
                                close(input.get());
                            }
                        })
                .subscribeOn(Schedulers.boundedElastic())
                .timeout(Duration.ofSeconds(120));
    }

    private ChatResponse request(
            Prompt prompt,
            FluxSink<ChatResponse> sink,
            AtomicReference<InputStream> input,
            AtomicReference<java.util.concurrent.CompletableFuture<?>> pending)
            throws Exception {
        HttpRequest.Builder request =
                HttpRequest.newBuilder(URI.create(ModelConnection.endpoint(config)))
                        .timeout(Duration.ofSeconds(120))
                        .header("Content-Type", "application/json")
                        .header("Accept", "text/event-stream");
        if (ModelConnection.protocol(config).equals("anthropic-messages"))
            request.header("anthropic-version", "2023-06-01");
        if (ModelConnection.authMode(config).equals("default")) {
            request.header(
                    ModelConnection.protocol(config).equals("anthropic-messages")
                            ? "x-api-key"
                            : "Authorization",
                    ModelConnection.protocol(config).equals("anthropic-messages")
                            ? config.getApiKey()
                            : "Bearer " + config.getApiKey());
        }
        if (config.getHeaders() != null) config.getHeaders().forEach(request::setHeader);
        request.POST(
                HttpRequest.BodyPublishers.ofString(
                        JSON.writeValueAsString(ProtocolRequest.body(config, prompt, tools))));
        var future = HTTP.sendAsync(request.build(), HttpResponse.BodyHandlers.ofInputStream());
        pending.set(future);
        if (sink.isCancelled()) future.cancel(true);
        HttpResponse<InputStream> response = future.get();
        input.set(response.body());
        if (sink.isCancelled()) {
            close(response.body());
            return null;
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            int status = response.statusCode();
            throw new ModelProviderException(
                    "Provider HTTP " + status, status == 408 || status == 429 || status >= 500);
        }
        ProtocolStream accumulator = new ProtocolStream(config);
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader =
                new BufferedReader(
                        new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            StringBuilder data = new StringBuilder();
            String line;
            while (!sink.isCancelled() && (line = reader.readLine()) != null) {
                if (line.startsWith("data:")) {
                    if (!data.isEmpty()) data.append('\n');
                    data.append(line.substring(5).stripLeading());
                    if (data.length() > 8 * 1024 * 1024)
                        throw new ModelProviderException("Provider event is too large", false);
                } else if (line.isEmpty() && !data.isEmpty()) {
                    emit(data.toString(), accumulator, sink, text);
                    data.setLength(0);
                }
            }
            if (!sink.isCancelled() && !data.isEmpty())
                emit(data.toString(), accumulator, sink, text);
        }
        if (sink.isCancelled()) return null;
        ChatResponse result = accumulator.finish();
        return new ChatResponse(
                List.of(
                        new Generation(
                                result.getResult()
                                        .getOutput()
                                        .mutate()
                                        .content(text.toString())
                                        .build())),
                result.getMetadata());
    }

    private void emit(
            String data,
            ProtocolStream accumulator,
            FluxSink<ChatResponse> sink,
            StringBuilder text)
            throws Exception {
        if (data.equals("[DONE]")) return;
        ChatResponse delta = accumulator.accept(JSON.readTree(data));
        if (delta != null) {
            text.append(delta.getResult().getOutput().getText());
            sink.next(delta);
        }
    }

    private static void close(InputStream input) {
        if (input != null) {
            try {
                input.close();
            } catch (Exception ignored) {
                /* cancellation cleanup */
            }
        }
    }
}
