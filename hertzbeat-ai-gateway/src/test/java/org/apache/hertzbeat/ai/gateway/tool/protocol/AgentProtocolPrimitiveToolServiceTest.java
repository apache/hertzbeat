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

package org.apache.hertzbeat.ai.gateway.tool.protocol;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Test protocol primitive enforcement. */
class AgentProtocolPrimitiveToolServiceTest {

    private AgentProtocolPrimitiveSupport support;
    private AgentProtocolPrimitiveToolService service;

    @BeforeEach
    void setUp() {
        support = mock(AgentProtocolPrimitiveSupport.class);
        service = new AgentProtocolPrimitiveToolService(support);
    }

    @Test
    void shouldRejectMutationFromReadTool() {
        assertThrows(IllegalArgumentException.class,
                () -> service.query(42L, "UPDATE account SET enabled = false", List.of("affected"), 10,
                        "investigate account state", null));

        verifyNoInteractions(support);
    }

    @Test
    void shouldRejectSelectWithSideEffects() {
        assertThrows(IllegalArgumentException.class,
                () -> service.query(42L, "SELECT SLEEP(10)", List.of("result"), 10,
                        "investigate database latency", null));

        verifyNoInteractions(support);
    }

    @Test
    void shouldAcceptSingleReadOnlySelect() {
        AgentToolOutput output = AgentToolOutput.builder().status(AgentToolStatus.SUCCEEDED).build();
        when(support.execute(anyLong(), eq("jdbc"), isNull(), anyInt(), any())).thenReturn(output);

        service.query(42L, "SELECT id, name FROM account", List.of("id", "name"), 10,
                "investigate account state", null);

        verify(support).execute(anyLong(), eq("jdbc"), isNull(), eq(10), any());
    }
}
