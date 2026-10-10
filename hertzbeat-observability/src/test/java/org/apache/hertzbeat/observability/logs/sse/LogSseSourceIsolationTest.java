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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/** The trusted broadcast path, not client resource attributes, selects the source. */
class LogSseSourceIsolationTest {
    private final LogSseManager manager = new LogSseManager();

    @AfterEach
    void cleanUp() {
        TelemetrySourceContext.clear();
        manager.shutdown();
    }

    @Test
    void sameIdAndForgedAttributesCannotCrossSourcesAfterRequestContextClears() throws Exception {
        var external = new CopyOnWriteArrayList<LogEntry>();
        var self = new CopyOnWriteArrayList<LogEntry>();
        manager.start();
        manager.createEmitter(1L, criteria(), emitter(external));
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "ci_self", "default"));
        manager.createEmitter(2L, criteria(), emitter(self));
        TelemetrySourceContext.clear();
        LogEntry externalEntry = entry("external", Map.of("hertzbeat.workspace_id", "default", "source", "self"));
        LogEntry selfEntry = entry("self", Map.of("hertzbeat.workspace_id", "default", "source", "external"));
        manager.broadcast(externalEntry);
        manager.broadcastSelf(selfEntry);
        manager.broadcastSelf(entry("unscoped", Map.of()));
        await().untilAsserted(() -> {
            assertEquals(List.of(externalEntry), external);
            assertEquals(List.of(selfEntry), self);
        });
    }

    @Test
    void selfMatcherFreezesStrictWorkspaceWhileExternalKeepsHistoricalFallback() {
        var legacy = entry("legacy", Map.of());
        assertTrue(criteria().matches(legacy));
        TelemetrySourceContext.bind(new TelemetrySourceContext.Route(TelemetrySource.SELF, "ci_self", "default"));
        var matcher = criteria().snapshot().matcher();
        TelemetrySourceContext.clear();
        assertFalse(matcher.test(legacy));
        assertFalse(matcher.test(entry("other", Map.of("hertzbeat.workspace_id", "other"))));
        assertTrue(matcher.test(entry("authorized", Map.of("hertzbeat.workspace_id", "default"))));
    }

    private LogSseFilterCriteria criteria() {
        var criteria = new LogSseFilterCriteria();
        criteria.setWorkspaceId("default");
        return criteria;
    }

    private LogEntry entry(String body, Map<String, Object> resource) {
        return LogEntry.builder().traceId("same-trace-id").spanId("same-span-id").body(body).resource(resource).build();
    }

    private SseEmitter emitter(List<LogEntry> received) throws Exception {
        var emitter = mock(SseEmitter.class);
        doAnswer(invocation -> {
            invocation.<SseEmitter.SseEventBuilder>getArgument(0).build().stream()
                    .map(org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter.DataWithMediaType::getData)
                    .filter(LogEntry.class::isInstance).map(LogEntry.class::cast).forEach(received::add);
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        return emitter;
    }
}
