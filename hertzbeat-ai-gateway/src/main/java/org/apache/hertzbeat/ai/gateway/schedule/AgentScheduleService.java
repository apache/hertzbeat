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

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunService;
import org.apache.hertzbeat.ai.gateway.conversation.AgentRunStatus;
import org.apache.hertzbeat.ai.gateway.conversation.AgentSessionService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.apache.hertzbeat.common.support.event.SystemConfigChangeEvent;

/**
 * Agent schedule lifecycle and trigger claiming.
 */
@Service
public class AgentScheduleService {

    private static final int DISPATCH_BATCH_SIZE = 100;

    private final AgentScheduleDao scheduleDao;
    private final AgentSessionService sessionService;
    private final AgentRunService runService;
    private final NoticeConfigService noticeConfigService;

    public AgentScheduleService(AgentScheduleDao scheduleDao,
                                AgentSessionService sessionService,
                                AgentRunService runService,
                                NoticeConfigService noticeConfigService) {
        this.scheduleDao = scheduleDao;
        this.sessionService = sessionService;
        this.runService = runService;
        this.noticeConfigService = noticeConfigService;
    }

    @Transactional
    public AgentSchedule create(AgentSchedule schedule) {
        validate(schedule);
        schedule.setId(null);
        schedule.setSessionId(null);
        schedule.setLastTriggerAt(null);
        schedule.setNextTriggerAt(schedule.isEnabled() ? nextTriggerAt(schedule.getCronExpression()) : null);
        AgentSchedule saved = scheduleDao.saveAndFlush(schedule);
        saved.setSessionId(scheduleSession(saved).getId());
        return scheduleDao.save(saved);
    }

    @Transactional
    public AgentSchedule update(Long scheduleId, AgentSchedule input) {
        AgentSchedule schedule = get(scheduleId);
        rejectWhileRunning(schedule);
        schedule.setName(input.getName());
        schedule.setInstruction(input.getInstruction());
        schedule.setCronExpression(input.getCronExpression());
        schedule.setReceiverIds(input.getReceiverIds());
        schedule.setTemplateId(input.getTemplateId());
        validate(schedule);
        schedule.setNextTriggerAt(schedule.isEnabled() ? nextTriggerAt(schedule.getCronExpression()) : null);
        return scheduleDao.save(schedule);
    }

    public AgentSchedule get(Long scheduleId) {
        return scheduleDao.findById(scheduleId)
                .orElseThrow(() -> new IllegalArgumentException("Agent schedule not found: " + scheduleId));
    }

    public Page<AgentSchedule> list(Pageable pageable) {
        return scheduleDao.findAll(pageable);
    }

    @Transactional
    public AgentSchedule toggle(Long scheduleId, boolean enabled) {
        AgentSchedule schedule = get(scheduleId);
        if (!enabled) {
            rejectWhileRunning(schedule);
        } else {
            validate(schedule);
        }
        schedule.setEnabled(enabled);
        schedule.setNextTriggerAt(enabled ? nextTriggerAt(schedule.getCronExpression()) : null);
        return scheduleDao.save(schedule);
    }

    @Transactional
    public void delete(Long scheduleId) {
        AgentSchedule schedule = get(scheduleId);
        rejectWhileRunning(schedule);
        scheduleDao.delete(schedule);
    }

    public List<AgentSchedule> findDue(long now) {
        return scheduleDao.findByEnabledTrueAndNextTriggerAtLessThanEqualOrderByNextTriggerAtAsc(
                now, PageRequest.of(0, DISPATCH_BATCH_SIZE));
    }

    public List<AgentSchedule> findPending() {
        return scheduleDao.findWithRuns(AgentRunStatus.CREATED.name(),
                PageRequest.of(0, DISPATCH_BATCH_SIZE));
    }

    public List<AgentSchedule> findInterrupted() {
        return scheduleDao.findWithRuns(AgentRunStatus.RUNNING.name(),
                Pageable.unpaged());
    }

    @Transactional
    public Optional<AgentRun> claimCronRun(Long scheduleId, long now) {
        AgentSchedule schedule = get(scheduleId);
        if (!schedule.isEnabled() || schedule.getNextTriggerAt() == null || schedule.getNextTriggerAt() > now) {
            return Optional.empty();
        }
        long plannedAt = schedule.getNextTriggerAt();
        schedule.setLastTriggerAt(plannedAt);
        schedule.setNextTriggerAt(nextTriggerAt(schedule.getCronExpression()));
        if (runService.hasActiveRun(schedule.getSessionId())) {
            scheduleDao.save(schedule);
            return Optional.empty();
        }
        AgentRun run = createRun(schedule, "schedule:" + schedule.getId() + ":cron:" + plannedAt);
        scheduleDao.save(schedule);
        return Optional.of(run);
    }

    @Transactional
    public AgentRun claimManualRun(Long scheduleId) {
        AgentSchedule schedule = get(scheduleId);
        if (runService.hasActiveRun(schedule.getSessionId())) {
            throw new IllegalStateException("Agent schedule already has an active run");
        }
        schedule.setLastTriggerAt(System.currentTimeMillis());
        AgentRun run = createRun(schedule,
                "schedule:" + schedule.getId() + ":manual:" + SnowFlakeIdGenerator.generateId());
        scheduleDao.save(schedule);
        return run;
    }

    public Optional<AgentRun> findCreatedRun(AgentSchedule schedule) {
        return runService.findCreatedRun(schedule.getSessionId());
    }

    public Optional<AgentSchedule> findBySessionId(Long sessionId) {
        return scheduleDao.findBySessionId(sessionId);
    }

    @EventListener(SystemConfigChangeEvent.class)
    @Transactional
    public void onSystemConfigChanged(SystemConfigChangeEvent event) {
        for (AgentSchedule schedule : scheduleDao.findByEnabledTrue()) {
            schedule.setNextTriggerAt(nextTriggerAt(schedule.getCronExpression()));
        }
    }

    private AgentRun createRun(AgentSchedule schedule, String messageId) {
        AgentSession session = scheduleSession(schedule);
        UserInput input = scheduleInput(schedule, messageId);
        return runService.createOrResumeRun(session, input, AgentRuntimeEntryType.SCHEDULE_TRIGGER);
    }

    private AgentSession scheduleSession(AgentSchedule schedule) {
        if (schedule.getSessionId() != null) {
            return sessionService.findSession(String.valueOf(schedule.getSessionId()))
                    .orElseThrow(() -> new IllegalStateException(
                            "Agent schedule session not found: " + schedule.getSessionId()));
        }
        long now = System.currentTimeMillis();
        return sessionService.findOrCreateSession(
                GatewayEnvelope.builder()
                        .channelId(ChannelId.SYSTEM.id())
                        .receivedAt(now)
                        .actor(AgentActor.scheduleActor())
                        .build(),
                scheduleInput(schedule, "schedule-session:" + schedule.getId()),
                AgentRuntimeEntryType.SCHEDULE_TRIGGER);
    }

    private UserInput scheduleInput(AgentSchedule schedule, String messageId) {
        return UserInput.builder()
                .messageId(messageId)
                .conversationId("schedule:" + schedule.getId())
                .message(UserInput.Message.builder().text(schedule.getInstruction()).build())
                .build();
    }

    private void rejectWhileRunning(AgentSchedule schedule) {
        if (schedule.getSessionId() != null && runService.hasActiveRun(schedule.getSessionId())) {
            throw new IllegalStateException("Agent schedule cannot be changed while a run is active");
        }
    }

    private void validate(AgentSchedule schedule) {
        if (!StringUtils.hasText(schedule.getName()) || schedule.getName().length() > 128) {
            throw new IllegalArgumentException("Agent schedule name is required and must not exceed 128 characters");
        }
        if (!StringUtils.hasText(schedule.getInstruction()) || schedule.getInstruction().length() > 4096) {
            throw new IllegalArgumentException(
                    "Agent schedule instruction is required and must not exceed 4096 characters");
        }
        if (!StringUtils.hasText(schedule.getCronExpression()) || schedule.getCronExpression().length() > 64) {
            throw new IllegalArgumentException(
                    "Agent schedule cron expression is required and must not exceed 64 characters");
        }
        // API and tool callers may repeat receiver IDs; this boundary prevents duplicate notifications.
        List<Long> receiverIds = schedule.getReceiverIds() == null
                ? List.of()
                : List.copyOf(new LinkedHashSet<>(schedule.getReceiverIds()));
        if (receiverIds.isEmpty() || receiverIds.stream().anyMatch(id -> id == null)) {
            throw new IllegalArgumentException("At least one notice receiver is required");
        }
        schedule.setReceiverIds(receiverIds);
        List<NoticeReceiver> receivers = receiverIds.stream()
                .map(id -> {
                    NoticeReceiver receiver = noticeConfigService.getReceiverById(id);
                    if (receiver == null) {
                        throw new IllegalArgumentException("Notice receiver not found: " + id);
                    }
                    return receiver;
                })
                .toList();
        if (schedule.getTemplateId() == null) {
            for (NoticeReceiver receiver : receivers) {
                if (receiver.getType() != 0
                        && noticeConfigService.getDefaultNoticeTemplateByType(receiver.getType()) == null) {
                    throw new IllegalArgumentException(
                            "Default notice template not found for receiver type: " + receiver.getType());
                }
            }
            nextTriggerAt(schedule.getCronExpression());
            return;
        }
        NoticeTemplate template = noticeConfigService.getNoticeTemplatesById(schedule.getTemplateId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Notice template not found: " + schedule.getTemplateId()));
        if (receivers.stream().anyMatch(receiver -> !template.getType().equals(receiver.getType()))) {
            throw new IllegalArgumentException("Notice template type must match every receiver type");
        }
        nextTriggerAt(schedule.getCronExpression());
    }

    private long nextTriggerAt(String expression) {
        // Cron input may contain repeated whitespace; split fields only to enforce the minute-level scheduling contract.
        String[] fields = expression.trim().split("\\s+");
        if (fields.length != 6 || !"0".equals(fields[0])) {
            throw new IllegalArgumentException(
                    "Agent schedule requires a six-field Spring cron expression with seconds set to 0");
        }
        ZonedDateTime next = CronExpression.parse(expression)
                .next(ZonedDateTime.now(ZoneId.systemDefault()));
        if (next == null) {
            throw new IllegalArgumentException("Agent schedule cron expression has no next execution time");
        }
        return next.toInstant().toEpochMilli();
    }
}
