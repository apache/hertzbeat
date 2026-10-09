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
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import okhttp3.Call;
import okhttp3.Interceptor;
import okhttp3.Response;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.StreamingChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import reactor.core.publisher.Flux;

/** Cancels this subscription's native HTTP calls before the SDK closes its blocking reader. */
final class OpenAiStreamBridge implements StreamingChatModel {

    private static final String SCOPE_HEADER = "X-HertzBeat-Stream-Scope";
    private final Map<String, CallScope> scopes = new ConcurrentHashMap<>();
    private final OpenAiChatModel model;

    OpenAiStreamBridge(OpenAiChatOptions defaults) {
        model = OpenAiChatModel.builder().options(withScopeHeader(defaults, null))
                .httpClientBuilderCustomizer(builder -> builder.interceptor(this::intercept)).build();
    }

    @Override
    public Flux<ChatResponse> stream(Prompt prompt) {
        return Flux.using(() -> {
            CallScope scope = new CallScope();
            scopes.put(scope.id, scope);
            return scope;
        }, scope -> {
            OpenAiChatOptions options = prompt.getOptions() == null
                    ? model.getOptions() : (OpenAiChatOptions) prompt.getOptions();
            Prompt scoped = prompt.mutate().chatOptions(withScopeHeader(options, scope.id)).build();
            // SDK reader.close may wait behind a silent read; Call.cancel releases that read first.
            return model.stream(scoped).doOnCancel(scope::cancel);
        }, scope -> {
            scopes.remove(scope.id, scope);
            scope.finish();
        });
    }

    private OpenAiChatOptions withScopeHeader(OpenAiChatOptions options, String scopeId) {
        Map<String, String> headers = new HashMap<>();
        if (options.getCustomHeaders() != null) {
            options.getCustomHeaders().forEach((name, value) -> {
                if (!name.equalsIgnoreCase(SCOPE_HEADER)) {
                    headers.put(name, value);
                }
            });
        }
        if (scopeId != null) {
            headers.put(SCOPE_HEADER, scopeId);
        }
        return options.mutate().customHeaders(headers).build();
    }

    private Response intercept(Interceptor.Chain chain) throws IOException {
        String id = chain.request().header(SCOPE_HEADER);
        CallScope scope = id == null ? null : scopes.get(id);
        if (scope == null || !scope.register(chain.call())) {
            // A call queued before cancellation may enter its interceptor after scope cleanup.
            chain.call().cancel();
            throw new IOException("Model stream scope is closed");
        }
        return chain.proceed(chain.request().newBuilder().removeHeader(SCOPE_HEADER).build());
    }

    private static final class CallScope {
        private final String id = UUID.randomUUID().toString();
        private final Set<Call> calls = new HashSet<>();
        private boolean closed;

        private synchronized boolean register(Call call) {
            if (closed) {
                return false;
            }
            calls.add(call);
            return true;
        }

        private void cancel() {
            Set<Call> snapshot;
            synchronized (this) {
                closed = true;
                snapshot = Set.copyOf(calls);
                calls.clear();
            }
            snapshot.forEach(Call::cancel);
        }

        private synchronized void finish() {
            closed = true;
            calls.clear();
        }
    }
}
