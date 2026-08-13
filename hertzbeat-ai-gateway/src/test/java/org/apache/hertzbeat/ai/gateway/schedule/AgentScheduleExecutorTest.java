/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.schedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.Meta;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for {@link AgentScheduleExecutor}.
 */
@ExtendWith(MockitoExtension.class)
class AgentScheduleExecutorTest {

    @Mock
    private AgentScheduleService scheduleService;
    @Mock
    private AgentRunService runService;
    @Mock
    private GatewayCommandRouter commandRouter;
    @Mock
    private AgentScheduleNoticeService noticeService;

    private AgentScheduleExecutor executor;

    @AfterEach
    void tearDown() {
        if (executor != null) {
            executor.close();
        }
    }

    @Test
    void shouldRunWithFixedSystemIdentityAndSession() throws InterruptedException {
        AgentSchedule schedule = AgentSchedule.builder()
                .id(7L)
                .sessionId(21L)
                .instruction("Inspect all unhealthy monitors")
                .receiverIds(List.of(10L))
                .build();
        AgentRun run = AgentRun.builder()
                .runUid("run_1")
                .sessionId(21L)
                .messageId("schedule:7:manual:1")
                .status("CREATED")
                .build();
        CountDownLatch handled = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(scheduleService.claimManualRun(7L)).thenReturn(run);
        when(scheduleService.get(7L)).thenReturn(schedule);
        when(commandRouter.handle(any())).thenAnswer(invocation -> {
            handled.countDown();
            release.await(5, TimeUnit.SECONDS);
            return GatewaySingleResponse.builder()
                    .meta(Meta.builder().commandId(run.getMessageId()).terminal(true).message("completed").build())
                    .body(Map.of("status", "SUCCEEDED", "message", "Healthy"))
                    .events(List.of())
                    .build();
        });
        when(runService.findRun("run_1")).thenReturn(Optional.of(run));

        executor = new AgentScheduleExecutor(scheduleService, runService, commandRouter, noticeService);
        executor.executeNow(7L);

        assertTrue(handled.await(5, TimeUnit.SECONDS));
        assertThrows(IllegalStateException.class, () -> executor.executeNow(7L));
        release.countDown();
        verify(noticeService, timeout(5000)).send(schedule, run, true, "Healthy");
        ArgumentCaptor<InvokeCommand> command = ArgumentCaptor.forClass(InvokeCommand.class);
        verify(commandRouter).handle(command.capture());
        assertEquals(ChannelId.SYSTEM.id(), command.getValue().envelope().getChannelId());
        assertEquals(ActorSupport.TYPE_SYSTEM, command.getValue().envelope().getActor().getType());
        assertEquals(ActorSupport.ID_SCHEDULE, command.getValue().envelope().getActor().getId());
        assertEquals("schedule:7", command.getValue().userInput().getConversationId());
        assertEquals(AgentRuntimeEntryType.SCHEDULE_TRIGGER, command.getValue().entryType());
    }

    @Test
    void shouldFailInterruptedRunOnStartup() {
        AgentSchedule schedule = AgentSchedule.builder().id(7L).sessionId(21L).build();
        AgentRun running = AgentRun.builder().runUid("run_interrupted").status("RUNNING").build();
        AgentRun failed = AgentRun.builder().runUid("run_interrupted").status("FAILED").build();
        when(scheduleService.findInterrupted()).thenReturn(List.of(schedule));
        when(runService.findRunningRun(21L)).thenReturn(Optional.of(running));
        when(runService.markFailed(any(), any())).thenReturn(failed);
        executor = new AgentScheduleExecutor(scheduleService, runService, commandRouter, noticeService);

        executor.failInterruptedRuns();

        verify(runService).markFailed(running, "Agent schedule execution was interrupted by process restart");
        verify(noticeService).send(schedule, failed, false,
                "Agent schedule execution was interrupted by process restart");
    }
}
