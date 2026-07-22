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

package org.apache.hertzbeat.ai.sop.registry;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.sop.engine.SopEngine;
import org.apache.hertzbeat.ai.sop.model.OutputType;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;

/**
 * Verifies the input contract and execution behavior of a SOP exposed as a Spring AI tool.
 */
class SopToolCallbackTest {

    @Test
    @SuppressWarnings("unchecked")
    void schemaShouldDeclareRequiredParametersAndEscapeDescriptions() {
        SopDefinition definition = definition();
        SopToolCallback callback = new SopToolCallback(definition, new RecordingEngine());

        Map<String, Object> schema = JsonUtil.fromJson(callback.getToolDefinition().inputSchema(), Map.class);
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        Map<String, Object> monitorId = (Map<String, Object>) properties.get("monitorId");
        Map<String, Object> limit = (Map<String, Object>) properties.get("limit");

        assertEquals(List.of("monitorId"), schema.get("required"));
        assertEquals(false, schema.get("additionalProperties"));
        assertEquals("integer", monitorId.get("type"));
        assertEquals("包含 \"引号\" 的说明", monitorId.get("description"));
        assertEquals(10, limit.get("default"));
    }

    @Test
    void callShouldParseArgumentsAndExecuteSop() {
        RecordingEngine engine = new RecordingEngine();
        SopToolCallback callback = new SopToolCallback(definition(), engine);

        String response = callback.call("{\"monitorId\":42}");

        assertEquals(42, engine.inputParams.get().get("monitorId"));
        assertTrue(response.contains("SUCCESS"));
        assertFalse(response.contains("execution started"));
    }

    @Test
    void callShouldRejectInvalidJson() {
        SopToolCallback callback = new SopToolCallback(definition(), new RecordingEngine());

        assertThrows(IllegalArgumentException.class, () -> callback.call("not-json"));
    }

    private SopDefinition definition() {
        SopParameter monitorId = SopParameter.builder()
                .name("monitorId")
                .type("long")
                .description("包含 \"引号\" 的说明")
                .required(true)
                .build();
        SopParameter limit = SopParameter.builder()
                .name("limit")
                .type("integer")
                .defaultValue("10")
                .build();
        return SopDefinition.builder()
                .name("diagnose")
                .description("诊断工具")
                .version("1.0")
                .parameters(List.of(monitorId, limit))
                .build();
    }

    private static final class RecordingEngine implements SopEngine {

        private final AtomicReference<Map<String, Object>> inputParams = new AtomicReference<>();

        @Override
        public Flux<String> execute(SopDefinition definition, Map<String, Object> inputParams) {
            return Flux.empty();
        }

        @Override
        public SopResult executeSync(SopDefinition definition, Map<String, Object> inputParams) {
            this.inputParams.set(inputParams);
            return SopResult.builder()
                    .sopName(definition.getName())
                    .sopVersion(definition.getVersion())
                    .status("SUCCESS")
                    .outputType(OutputType.SIMPLE)
                    .build();
        }
    }
}
