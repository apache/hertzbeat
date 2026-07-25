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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link TranscriptMessage}.
 */
class TranscriptMessageTest {

    @Test
    void assistantToolCallReplayShouldRequireIdAndName() {
        assertTrue(assistantToolCall("call-1", "monitor.get").hasReplayContent());
        assertFalse(assistantToolCall(null, "monitor.get").hasReplayContent());
        assertFalse(assistantToolCall("call-1", null).hasReplayContent());
        assertTrue(assistantToolCall(null, "monitor.get").toolCalls().isEmpty());
        assertTrue(assistantToolCall("call-1", null).toolCalls().isEmpty());
    }

    @Test
    void toolResultReplayShouldRequireIdAndName() {
        assertTrue(TranscriptMessage.toolResult("call-1", "monitor.get", "result", null)
                .hasReplayContent());
        assertFalse(TranscriptMessage.toolResult(null, "monitor.get", "result", null)
                .hasReplayContent());
        assertFalse(TranscriptMessage.toolResult("call-1", null, "result", null)
                .hasReplayContent());
    }

    private TranscriptMessage assistantToolCall(String id, String name) {
        return TranscriptMessage.assistantToolCalls("", List.of(
                TranscriptContent.toolCall(id, name, Map.of())));
    }
}
