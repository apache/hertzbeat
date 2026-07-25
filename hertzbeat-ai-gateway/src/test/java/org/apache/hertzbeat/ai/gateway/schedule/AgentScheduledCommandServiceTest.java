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

package org.apache.hertzbeat.ai.gateway.schedule;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link AgentScheduledCommandService}.
 */
@ExtendWith(MockitoExtension.class)
class AgentScheduledCommandServiceTest {

    @Mock
    private AgentScheduledCommandDao commandDao;

    @Test
    void shouldCalculateNextExecutionWhenCreatingCommand() {
        AgentScheduledCommand command = AgentScheduledCommand.builder()
                .sessionId(1L)
                .message("Inspect monitor health")
                .cronExpression("0 0 9 * * ?")
                .build();
        when(commandDao.save(command)).thenReturn(command);

        AgentScheduledCommand result = service().create(command);

        assertNotNull(result.getNextRunTime());
    }

    @Test
    void shouldNotScheduleDisabledCommand() {
        AgentScheduledCommand command = AgentScheduledCommand.builder()
                .sessionId(1L)
                .message("Inspect monitor health")
                .cronExpression("0 0 9 * * ?")
                .enabled(false)
                .build();
        when(commandDao.save(command)).thenReturn(command);

        AgentScheduledCommand result = service().create(command);

        assertNull(result.getNextRunTime());
    }

    @Test
    void shouldRejectCommandOwnedByDifferentSession() {
        AgentScheduledCommand command = AgentScheduledCommand.builder().id(2L).sessionId(1L).build();
        when(commandDao.findById(2L)).thenReturn(Optional.of(command));

        assertThrows(IllegalArgumentException.class, () -> service().getOwned(2L, 3L));
    }

    private AgentScheduledCommandService service() {
        return new AgentScheduledCommandService(commandDao);
    }
}
