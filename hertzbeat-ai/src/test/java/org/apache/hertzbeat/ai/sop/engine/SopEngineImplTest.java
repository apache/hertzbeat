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

package org.apache.hertzbeat.ai.sop.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.sop.executor.SopExecutor;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.junit.jupiter.api.Test;

/**
 * Verifies that all SOP execution entry points follow the same parameter contract.
 */
class SopEngineImplTest {

    @Test
    void executeSyncShouldReturnFailureForNullDefinition() {
        SopEngineImpl engine = new SopEngineImpl(List.of());

        SopResult result = engine.executeSync(null, Map.of());

        assertEquals("FAILED", result.getStatus());
        assertTrue(result.getError().contains("must not be null"));
    }

    @Test
    void executeSyncShouldRejectMissingRequiredParameter() {
        SopEngineImpl engine = new SopEngineImpl(List.of(new RecordingExecutor()));

        SopResult result = engine.executeSync(definition(requiredParameter()), Map.of());

        assertEquals("FAILED", result.getStatus());
        assertTrue(result.getError().contains("monitorId"));
        assertTrue(result.getSteps().isEmpty());
    }

    @Test
    void executeSyncShouldApplyDefaultParameter() {
        AtomicReference<Map<String, Object>> capturedContext = new AtomicReference<>();
        SopEngineImpl engine = new SopEngineImpl(List.of(new RecordingExecutor(capturedContext)));

        SopResult result = engine.executeSync(definition(defaultParameter()), Map.of());

        assertEquals("SUCCESS", result.getStatus());
        assertEquals("10", capturedContext.get().get("limit"));
        assertEquals("zh", capturedContext.get().get("_language"));
        assertEquals("10", result.getData().get("limit"));
    }

    @Test
    void executeStreamShouldApplyTheSameParameterRules() {
        AtomicReference<Map<String, Object>> capturedContext = new AtomicReference<>();
        SopEngineImpl engine = new SopEngineImpl(List.of(new RecordingExecutor(capturedContext)));

        List<String> events = engine.execute(definition(defaultParameter()), null).collectList().block();

        assertNotNull(events);
        assertTrue(events.getLast().contains("completed successfully"));
        assertEquals("10", capturedContext.get().get("limit"));
    }

    private SopDefinition definition(SopParameter parameter) {
        return SopDefinition.builder()
                .name("test-sop")
                .version("1.0")
                .parameters(List.of(parameter))
                .steps(List.of(SopStep.builder().id("query").type("tool").build()))
                .build();
    }

    private SopParameter requiredParameter() {
        return SopParameter.builder().name("monitorId").type("long").required(true).build();
    }

    private SopParameter defaultParameter() {
        return SopParameter.builder().name("limit").type("integer").defaultValue("10").build();
    }

    private static final class RecordingExecutor implements SopExecutor {

        private final AtomicReference<Map<String, Object>> capturedContext;

        private RecordingExecutor() {
            this(new AtomicReference<>());
        }

        private RecordingExecutor(AtomicReference<Map<String, Object>> capturedContext) {
            this.capturedContext = capturedContext;
        }

        @Override
        public boolean support(String type) {
            return "tool".equals(type);
        }

        @Override
        public Object execute(SopStep step, Map<String, Object> context) {
            capturedContext.set(Map.copyOf(context));
            return "ok";
        }
    }
}
