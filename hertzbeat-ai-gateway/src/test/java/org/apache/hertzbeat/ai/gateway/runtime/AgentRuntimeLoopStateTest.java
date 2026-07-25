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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.stream.IntStream;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.junit.jupiter.api.Test;

/** Test bounded on-demand tool state. */
class AgentRuntimeLoopStateTest {

    @Test
    void shouldRetainTwentyMostRecentlyDiscoveredTools() {
        AgentRuntimeLoopState state = new AgentRuntimeLoopState(List.of());
        List<AgentToolDescriptor> discovered = IntStream.range(0, 25)
                .mapToObj(this::descriptor)
                .toList();

        state.addDiscoveredTools(discovered);

        assertEquals(IntStream.range(5, 25).mapToObj(index -> "test.tool" + index).toList(),
                state.availableTools(List.of()).stream().map(AgentToolDescriptor::getName).toList());
    }

    @Test
    void shouldOnlyUseProviderUsageRecordedDuringCurrentUncompactedRun() {
        TranscriptMessage restoredAssistant = TranscriptMessage.assistantText("restored", usage(100));
        AgentRuntimeLoopState state = new AgentRuntimeLoopState(List.of(restoredAssistant));

        assertEquals(-1, state.latestCurrentRunUsageMessageIndex());

        state.addTurnMessage(TranscriptMessage.userText("current request"));
        state.addTurnMessage(TranscriptMessage.assistantText("current response", usage(120)));
        assertEquals(2, state.latestCurrentRunUsageMessageIndex());

        state.replaceMessages(state.messages());
        assertEquals(-1, state.latestCurrentRunUsageMessageIndex());

        state.addTurnMessage(TranscriptMessage.assistantText("after compaction", usage(80)));
        assertEquals(3, state.latestCurrentRunUsageMessageIndex());
    }

    private AgentRuntimeModelResponse.Usage usage(long totalTokens) {
        return AgentRuntimeModelResponse.Usage.builder()
                .promptTokens(totalTokens - 1)
                .completionTokens(1)
                .totalTokens(totalTokens)
                .build();
    }

    private AgentToolDescriptor descriptor(int index) {
        return AgentToolDescriptor.builder()
                .name("test.tool" + index)
                .description("Test tool")
                .inputSchema("{\"type\":\"object\"}")
                .risk(AgentToolRisk.READ)
                .namespace("test")
                .exposure(AgentToolExposure.MODEL_ON_DEMAND)
                .build();
    }
}
