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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentRuntimeTokenEstimator}.
 */
class AgentRuntimeTokenEstimatorTest {

    private final AgentRuntimeTokenEstimator estimator = new AgentRuntimeTokenEstimator();

    @Test
    void estimateTextShouldUseCeilingUtf8BytesDividedByFour() {
        assertEquals(1L, estimator.estimateText("test"));
        assertEquals(2L, estimator.estimateText("tests"));
        assertEquals(3L, estimator.estimateText("告警分析"));
    }

    @Test
    void estimateRequestShouldIncludePromptAndMessageStructure() {
        RuntimePrompt prompt = RuntimePrompt.builder()
            .instructions("Diagnose the monitor.")
            .build();
        AgentRuntimeModelRequest emptyHistory = AgentRuntimeModelRequest.builder()
            .prompt(prompt)
            .build();
        AgentRuntimeModelRequest withHistory = AgentRuntimeModelRequest.builder()
            .prompt(prompt)
            .chatHistory(List.of(TranscriptMessage.userText("Inspect monitor 42.")))
            .build();

        assertTrue(estimator.estimateRequest(withHistory) > estimator.estimateRequest(emptyHistory));
    }
}
