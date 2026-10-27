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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.hertzbeat.ai.gateway.application.GatewayEvent;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/** Correlates transport receipt and admission without reading bodies, identities or credentials. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class WebUiRequestDiagnostics extends OncePerRequestFilter {
    public static final String HEADER = "X-HertzBeat-Agent-Request-Id";
    private static final String ATTRIBUTE = WebUiRequestDiagnostics.class.getName() + ".id";
    private static final org.slf4j.Logger LOG =
            org.slf4j.LoggerFactory.getLogger(WebUiRequestDiagnostics.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !"POST".equals(request.getMethod())
                || !java.util.Set.of("/api/agent/webui/chat", "/api/agent/webui/chat/stream")
                        .contains(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String value = request.getHeader(HEADER);
        String id =
                value != null
                                && value.matches(
                                        "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
                        ? value.toLowerCase(java.util.Locale.ROOT)
                        : UUID.randomUUID().toString();
        request.setAttribute(ATTRIBUTE, id);
        response.setHeader(HEADER, id);
        long started = System.nanoTime();
        LOG.info("Agent HTTP received requestId={}", id);
        try {
            chain.doFilter(request, response);
        } finally {
            LOG.info(
                    "Agent HTTP dispatch requestId={} status={} async={} elapsedMs={}",
                    id,
                    response.getStatus(),
                    request.isAsyncStarted(),
                    elapsed(started));
            if (request.isAsyncStarted()) {
                var ended = new AtomicBoolean();
                AsyncListener listener =
                        new AsyncListener() {
                            private void end(String stage) {
                                if (ended.compareAndSet(false, true))
                                    LOG.info(
                                            "Agent HTTP finished requestId={} stage={} status={}"
                                                + " elapsedMs={}",
                                            id,
                                            stage,
                                            response.getStatus(),
                                            elapsed(started));
                            }

                            @Override
                            public void onComplete(AsyncEvent event) {
                                end("complete");
                            }

                            @Override
                            public void onTimeout(AsyncEvent event) {
                                end("timeout");
                            }

                            @Override
                            public void onError(AsyncEvent event) {
                                end("error");
                            }

                            @Override
                            public void onStartAsync(AsyncEvent event) {
                                event.getAsyncContext().addListener(this);
                            }
                        };
                try {
                    request.getAsyncContext().addListener(listener);
                } catch (IllegalStateException completed) {
                    LOG.info(
                            "Agent HTTP finished requestId={} stage=already_complete status={}"
                                + " elapsedMs={}",
                            id,
                            response.getStatus(),
                            elapsed(started));
                }
            }
        }
    }

    static String currentId() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servlet)) return null;
        Object value = servlet.getRequest().getAttribute(ATTRIBUTE);
        return value instanceof String id ? id : null;
    }

    static void firstEvent(String requestId, GatewayEvent event) {
        if (requestId == null) return;
        String run = event.runUid();
        LOG.info(
                "Agent HTTP first-event requestId={} eventType={} runUid={}",
                requestId,
                event.type(),
                run != null && run.matches("run_[0-9]{1,32}") ? run : "none");
    }

    static void admissionFailure(String requestId, Throwable failure) {
        if (requestId != null)
            LOG.info("Agent HTTP admission-failed requestId={} exceptionType={}", requestId,
                    failure.getClass().getSimpleName());
    }

    private static long elapsed(long started) {
        return java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    }
}
