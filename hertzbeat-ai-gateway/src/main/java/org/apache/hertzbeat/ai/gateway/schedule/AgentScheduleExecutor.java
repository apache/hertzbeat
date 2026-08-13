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

import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.application.GatewayResponse.GatewaySingleResponse;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.AgentResponseLanguage;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Claims due schedules and executes their standard Gateway commands asynchronously.
 */
@Slf4j
@Component
public class AgentScheduleExecutor {

    private final AgentScheduleService scheduleService;
    private final AgentRunService runService;
    private final GatewayCommandRouter commandRouter;
    private final AgentScheduleNoticeService noticeService;
    private final Set<Long> submittedSchedules = ConcurrentHashMap.newKeySet();
    private final ExecutorService executor = new ThreadPoolExecutor(4, 4, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(256), Thread.ofPlatform().name("agent-schedule-", 0).factory(),
            new ThreadPoolExecutor.AbortPolicy());

    public AgentScheduleExecutor(AgentScheduleService scheduleService,
                                 AgentRunService runService,
                                 GatewayCommandRouter commandRouter,
                                 AgentScheduleNoticeService noticeService) {
        this.scheduleService = scheduleService;
        this.runService = runService;
        this.commandRouter = commandRouter;
        this.noticeService = noticeService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void failInterruptedRuns() {
        for (AgentSchedule schedule : scheduleService.findInterrupted()) {
            runService.findRunningRun(schedule.getSessionId()).ifPresent(run -> {
                String message = "Agent schedule execution was interrupted by process restart";
                AgentRun failed = runService.markFailed(run, message);
                noticeService.send(schedule, failed, false, message);
            });
        }
    }

    @Scheduled(fixedDelay = 10_000L)
    public void executeDueSchedules() {
        for (AgentSchedule schedule : scheduleService.findPending()) {
            if (!submittedSchedules.add(schedule.getId())) {
                continue;
            }
            try {
                scheduleService.findCreatedRun(schedule)
                        .ifPresentOrElse(run -> submit(schedule, run),
                                () -> submittedSchedules.remove(schedule.getId()));
            } catch (RuntimeException exception) {
                submittedSchedules.remove(schedule.getId());
                log.error("Failed to recover pending Agent schedule {}", schedule.getId(), exception);
            }
        }
        long now = System.currentTimeMillis();
        for (AgentSchedule schedule : scheduleService.findDue(now)) {
            if (!submittedSchedules.add(schedule.getId())) {
                continue;
            }
            try {
                scheduleService.claimCronRun(schedule.getId(), now)
                        .ifPresentOrElse(run -> submit(scheduleService.get(schedule.getId()), run),
                                () -> submittedSchedules.remove(schedule.getId()));
            } catch (RuntimeException exception) {
                submittedSchedules.remove(schedule.getId());
                log.error("Failed to claim due Agent schedule {}", schedule.getId(), exception);
            }
        }
    }

    public AgentRun executeNow(Long scheduleId) {
        if (!submittedSchedules.add(scheduleId)) {
            throw new IllegalStateException("Agent schedule already has an active run");
        }
        try {
            AgentRun run = scheduleService.claimManualRun(scheduleId);
            submit(scheduleService.get(scheduleId), run);
            return run;
        } catch (RuntimeException exception) {
            submittedSchedules.remove(scheduleId);
            throw exception;
        }
    }

    private void submit(AgentSchedule schedule, AgentRun run) {
        try {
            executor.execute(() -> execute(schedule, run));
        } catch (RejectedExecutionException exception) {
            submittedSchedules.remove(schedule.getId());
            log.warn("Agent schedule {} execution was rejected: {}",
                    schedule.getId(), exception.getMessage());
        }
    }

    private void execute(AgentSchedule schedule, AgentRun run) {
        try {
            GatewaySingleResponse response = (GatewaySingleResponse) commandRouter.handle(command(schedule, run));
            Map<?, ?> body = response.body() instanceof Map<?, ?> map ? map : Map.of();
            boolean succeeded = AgentRunStatus.SUCCEEDED.name().equals(body.get("status"));
            Object responseMessage = body.get("message");
            String message = responseMessage == null
                    ? (succeeded ? "Agent schedule completed" : "Agent schedule failed")
                    : String.valueOf(responseMessage);
            noticeService.send(schedule, runService.findRun(run.getRunUid()).orElse(run), succeeded, message);
        } catch (RuntimeException exception) {
            AgentRun current = runService.findRun(run.getRunUid()).orElse(run);
            // Runtime failures such as interrupted providers may not carry a message; persist a useful terminal reason.
            String failureMessage = StringUtils.hasText(exception.getMessage())
                    ? exception.getMessage()
                    : "Agent schedule execution failed";
            if (!AgentRunStatus.FAILED.name().equals(current.getStatus())) {
                current = runService.markFailed(current, failureMessage);
            }
            noticeService.send(schedule, current, false, failureMessage);
            log.error("Agent schedule {} run {} failed", schedule.getId(), run.getRunUid(), exception);
        } finally {
            submittedSchedules.remove(schedule.getId());
        }
    }

    private InvokeCommand command(AgentSchedule schedule, AgentRun run) {
        long now = System.currentTimeMillis();
        return InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId(ChannelId.SYSTEM.id())
                        .receivedAt(now)
                        .preferredLanguage(AgentResponseLanguage.systemDefault())
                        .actor(AgentActor.scheduleActor())
                        .build())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId(run.getMessageId())
                .entryType(AgentRuntimeEntryType.SCHEDULE_TRIGGER)
                .userInput(UserInput.builder()
                        .messageId(run.getMessageId())
                        .conversationId("schedule:" + schedule.getId())
                        .message(UserInput.Message.builder().text(schedule.getInstruction()).build())
                        .build())
                .build();
    }

    @PreDestroy
    public void close() {
        executor.shutdownNow();
    }
}
