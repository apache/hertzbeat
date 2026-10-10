/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.observability.logs.sse;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySource;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** Exercises the existing production Boot runner without directly calling start. */
class LogSseSpringLifecycleTest {
    @Test
    void normalBootRuntimeStartsDeliveryAndContextCloseCompletesSubscribers() throws Exception {
        var received = new CopyOnWriteArrayList<LogEntry>();
        var emitter = mock(SseEmitter.class);
        doAnswer(invocation -> {
            invocation.<SseEmitter.SseEventBuilder>getArgument(0).build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter.DataWithMediaType::getData)
                    .filter(LogEntry.class::isInstance).map(LogEntry.class::cast).forEach(received::add);
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        try (var context = new SpringApplicationBuilder(LogSseManager.class, LogSseManagerLifecycle.class)
                .web(WebApplicationType.NONE).properties("hertzbeat.runtime.mode=normal", "spring.main.banner-mode=off")
                .run("--hertzbeat.runtime.mode=normal")) {
            var manager = context.getBean(LogSseManager.class);
            var criteria = new LogSseFilterCriteria();
            criteria.setWorkspaceId("default");
            TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "ci_self", "default"));
            manager.createEmitter(1L, criteria, emitter);
            TelemetrySourceContext.clear();
            var entry = LogEntry.builder().body("production lifecycle")
                    .resource(Map.of("hertzbeat.workspace_id", "default")).build();
            manager.broadcast(LogEntry.builder().body("external must not arrive")
                    .resource(Map.of("hertzbeat.workspace_id", "default")).build());
            manager.broadcastSelf(entry);
            await().untilAsserted(() -> assertEquals(List.of(entry), received));
        } finally {
            TelemetrySourceContext.clear();
        }
        verify(emitter).complete();
    }

    @Test
    void setupOnlyBootRuntimePreservesTheInactiveSideEffectBoundary() {
        try (var context = new SpringApplicationBuilder(LogSseManager.class, LogSseManagerLifecycle.class)
                .web(WebApplicationType.NONE).properties("hertzbeat.runtime.mode=setup_only", "spring.main.banner-mode=off")
                .run("--hertzbeat.runtime.mode=setup_only")) {
            assertFalse(context.containsBean("observabilityLogSseManagerLifecycle"));
        }
    }
}
