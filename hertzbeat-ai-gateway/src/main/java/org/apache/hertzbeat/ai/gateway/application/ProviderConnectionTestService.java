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

package org.apache.hertzbeat.ai.gateway.application;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import okhttp3.Call;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Category;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Request;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Result;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProtocol;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.provider.ProviderProbeDestinationPolicy;
import org.apache.hertzbeat.ai.gateway.runtime.provider.ProviderProbeTransport;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Bounded administrator-owned ephemeral tests. Configuration and credentials never enter a persistence path. */
@Service
public class ProviderConnectionTestService implements AutoCloseable {
    private final ModelProviderConfigurationService configurations;
    private final AgentModelProviderRegistry providers;
    private final ProviderProbeDestinationPolicy destinations;
    private final ProviderProbeTransport transport;
    private final ExecutorService workers = Executors.newVirtualThreadPerTaskExecutor();
    private final Semaphore permits = new Semaphore(4);
    private final ConcurrentHashMap<String, TestTask> active = new ConcurrentHashMap<>();
    private final Cache<String, Boolean> cancelled = Caffeine.newBuilder().maximumSize(256)
            .expireAfterWrite(Duration.ofMinutes(1)).build();

    public ProviderConnectionTestService(ModelProviderConfigurationService configurations, AgentModelProviderRegistry providers,
                                         ProviderProbeDestinationPolicy destinations, ProviderProbeTransport transport) {
        this.configurations = configurations;
        this.providers = providers;
        this.destinations = destinations;
        this.transport = transport;
    }

    public Result test(String owner, Request request) {
        if (request == null) throw new IllegalArgumentException();
        requireId(request.requestId());
        var task = new TestTask(request.requestId());
        if (request.config() != null) {
            task.protocol = "responses".equals(request.config().getProtocol()) ? "responses" : "chat-completions";
            String model = request.config().getModel();
            task.model = model != null && model.matches("[A-Za-z0-9_./:@-]{1,160}") ? model : null;
        }
        if (cancelled.getIfPresent(owner + ":" + request.requestId()) != null) return task.result(Category.CANCELLED, null);
        if (active.putIfAbsent(owner, task) != null) return task.result(Category.BUSY, null);
        if (!permits.tryAcquire()) {
            active.remove(owner, task);
            return task.result(Category.BUSY, null);
        }
        try {
            workers.submit(() -> execute(owner, task, request.config()));
        } catch (RuntimeException rejected) {
            active.remove(owner, task);
            permits.release();
            return task.result(Category.BUSY, null);
        }
        try {
            return task.completion.get(12, TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException timeout) {
            task.stop(Category.TIMEOUT);
            return task.completion.join();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            task.stop(Category.CANCELLED);
            return task.completion.join();
        } catch (java.util.concurrent.ExecutionException failure) {
            return task.result(Category.NETWORK, null);
        }
    }

    public boolean cancel(String owner, String id) {
        requireId(id);
        cancelled.put(owner + ":" + id, true);
        TestTask task = active.get(owner);
        if (task != null && task.id.equals(id)) task.stop(Category.CANCELLED);
        return true;
    }

    private void execute(String owner, TestTask task, ModelProviderConfig input) {
        ModelProviderConfig config = null;
        try {
            if (cancelled.getIfPresent(owner + ":" + task.id) != null) task.stop(Category.CANCELLED);
            if (task.completion.isDone()) return;
            config = resolve(input);
            task.protocol = "responses".equals(config.getProtocol()) ? "responses" : "chat-completions";
            task.model = config.getModel();
            var destination = destinations.resolve(config.getBaseUrl(), task.protocol);
            if (task.completion.isDone()) return;
            var outcome = transport.execute(destination, task.protocol, task.model, config.getApiKey(), call -> {
                task.call.set(call);
                if (task.completion.isDone()) call.cancel();
            });
            task.completion.complete(task.result(outcome.category(), outcome.httpStatus()));
        } catch (ProviderProbeDestinationPolicy.DestinationDenied denied) {
            task.completion.complete(task.result(Category.CONFIGURATION, null));
        } catch (CredentialRequired missing) {
            task.completion.complete(task.result(Category.CREDENTIAL_REQUIRED, null));
        } catch (IllegalArgumentException invalid) {
            task.completion.complete(task.result(Category.CONFIGURATION, null));
        } catch (Exception failure) {
            task.completion.complete(task.result(Category.NETWORK, null));
        } finally {
            if (config != null) config.setApiKey(null);
            active.remove(owner, task);
            permits.release();
        }
    }

    private ModelProviderConfig resolve(ModelProviderConfig input) {
        if (input == null || !"openai-compatible".equals(input.getType())) throw new IllegalArgumentException();
        AgentModelProtocol.parse(input.getProtocol());
        var option = providers.options().stream().filter(p -> p.type().equals(input.getType()) && p.code().equals(input.getCode()))
                .findFirst().orElseThrow(IllegalArgumentException::new);
        ModelProviderConfig config = new ModelProviderConfig();
        config.setType(input.getType());
        config.setCode(input.getCode());
        config.setProtocol(AgentModelProtocol.parse(input.getProtocol()).id());
        config.setBaseUrl(StringUtils.hasText(input.getBaseUrl()) ? input.getBaseUrl() : option.defaultBaseUrl());
        config.setModel(StringUtils.hasText(input.getModel()) ? input.getModel() : option.defaultModel());
        if (config.getModel() == null || !config.getModel().matches("[A-Za-z0-9_./:@-]{1,160}")) throw new IllegalArgumentException();
        var destination = ProviderProbeDestinationPolicy.parse(config.getBaseUrl());
        config.setApiKey(input.getApiKey());
        if (!StringUtils.hasText(config.getApiKey()) && StringUtils.hasText(input.getUid())) {
            var saved = configurations.getConfiguration(input.getUid());
            if (!Objects.equals(saved.getType(), config.getType()) || !Objects.equals(saved.getCode(), config.getCode())
                    || !ProviderProbeDestinationPolicy.origin(destination).equals(
                        ProviderProbeDestinationPolicy.origin(ProviderProbeDestinationPolicy.parse(saved.getBaseUrl())))) {
                throw new CredentialRequired();
            }
            config.setApiKey(saved.getApiKey());
        }
        return config;
    }

    private static void requireId(String id) {
        if (id == null || id.length() != 36) throw new IllegalArgumentException("Invalid connection test id");
        UUID.fromString(id);
    }

    @Override
    @PreDestroy
    public void close() {
        active.values().forEach(task -> task.stop(Category.CANCELLED));
        workers.shutdownNow();
    }

    private static final class CredentialRequired extends RuntimeException { }

    private static final class TestTask {
        private final String id;
        private final long started = System.nanoTime();
        private final CompletableFuture<Result> completion = new CompletableFuture<>();
        private final AtomicReference<Call> call = new AtomicReference<>();
        private volatile String protocol;
        private volatile String model;

        private TestTask(String id) { this.id = id; }

        private Result result(Category category, Integer status) {
            return new Result(protocol, model, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started), category, status);
        }

        private void stop(Category category) {
            completion.complete(result(category, null));
            Call current = call.get();
            if (current != null) current.cancel();
        }
    }
}
