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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.conversation.AgentExecutionSummaryService;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.junit.jupiter.api.Test;

class AgentAnswerExecutionStatusTest {
    @Test
    void countCompletesWhileDetailedRowCoverageShowsOneOfSix() {
        var result = summary("COUNT", "SUCCEEDED");
        assertEquals("NO_FAILED_ATTEMPTS", result.status());
        assertEquals(1L, result.queryCoverage().getFirst().returned());
        assertEquals(6L, result.queryCoverage().getFirst().total());
        assertTrue(result.queryCoverage().getFirst().partial());
    }

    @Test
    void requestedSinglePageIsNotAnIncompleteTask() {
        assertEquals("NO_FAILED_ATTEMPTS", summary("PAGE", "SUCCEEDED").status());
    }

    @Test
    void anExplicitFullListCannotBeDeclaredCompleteFromOnePage() {
        assertEquals("PARTIAL", summary("ALL_ROWS", "SUCCEEDED").status());
    }

    @Test
    void realFailureStillProducesIncompleteExecutionSummary() {
        assertEquals("PARTIAL", summary("COUNT", "FAILED").status());
    }

    private org.apache.hertzbeat.ai.gateway.conversation.AgentExecutionSummary summary(String purpose, String state) {
        var dao = mock(AgentToolCallDao.class);
        var row = AgentToolCall.builder().id(1L).runId(10L).runUid("run").sessionId(20L)
                .toolCallId("query").toolName("monitor.query").risk("READ").status(state)
                .inputJson("{\"purpose\":\"" + purpose + "\",\"pageIndex\":0,\"pageSize\":1}")
                .inputHash("hash").resultOutput("{\"content\":[{\"monitorId\":42}],\"totalElements\":6,\"pageIndex\":0,\"pageSize\":1}")
                .build();
        when(dao.findByRunIdOrderByGmtCreateAsc(10L)).thenReturn(List.of(row));
        var run = AgentRun.builder().id(10L).runUid("run").sessionId(20L).status("SUCCEEDED").build();
        return new AgentExecutionSummaryService(dao).summarize(run);
    }
}
