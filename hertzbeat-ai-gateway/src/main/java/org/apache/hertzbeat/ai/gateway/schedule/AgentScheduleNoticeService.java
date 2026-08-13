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
import java.util.List;
import java.util.Map;
import java.util.concurrent.RejectedExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Sends schedule results through the existing alert notification transports.
 */
@Slf4j
@Service
public class AgentScheduleNoticeService {

    private final NoticeConfigService noticeConfigService;
    private final AlertNoticeDispatch alertNoticeDispatch;
    private final AlerterWorkerPool workerPool;

    public AgentScheduleNoticeService(NoticeConfigService noticeConfigService,
                                      AlertNoticeDispatch alertNoticeDispatch,
                                      AlerterWorkerPool workerPool) {
        this.noticeConfigService = noticeConfigService;
        this.alertNoticeDispatch = alertNoticeDispatch;
        this.workerPool = workerPool;
    }

    public void send(AgentSchedule schedule, AgentRun run, boolean succeeded, String result) {
        NoticeTemplate template = schedule.getTemplateId() == null
                ? null
                : noticeConfigService.getOneTemplateById(schedule.getTemplateId());
        GroupAlert alert = scheduleAlert(schedule, run, succeeded, result);
        for (Long receiverId : schedule.getReceiverIds()) {
            NoticeReceiver receiver = noticeConfigService.getReceiverById(receiverId);
            if (receiver == null || receiver.getType() == null) {
                log.warn("Agent schedule {} skipped missing notice receiver {}", schedule.getId(), receiverId);
                continue;
            }
            try {
                workerPool.executeNotify(receiver.getType(), () -> {
                    try {
                        alertNoticeDispatch.sendNoticeMsg(receiver, template, alert);
                    } catch (RuntimeException exception) {
                        log.warn("Agent schedule {} failed to notify receiver {}: {}",
                                schedule.getId(), receiverId, exception.getMessage());
                    }
                });
            } catch (RejectedExecutionException exception) {
                log.warn("Agent schedule {} notification was rejected for receiver {}: {}",
                        schedule.getId(), receiverId, exception.getMessage());
            }
        }
    }

    private GroupAlert scheduleAlert(AgentSchedule schedule, AgentRun run, boolean succeeded, String result) {
        String status = succeeded ? "resolved" : "firing";
        String severity = succeeded ? "info" : "critical";
        // Model output crosses into external notification channels, so bound it to the existing alert content limit.
        String content = GatewayText.safeSummary(
                StringUtils.hasText(result) ? result : "Agent schedule execution failed", 4096);
        long startAt = run.getStartedAt() == null
                ? System.currentTimeMillis()
                : run.getStartedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        long endAt = run.getCompletedAt() == null
                ? System.currentTimeMillis()
                : run.getCompletedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        Map<String, String> labels = Map.of(
                "alertname", "Agent Schedule: " + schedule.getName(),
                "severity", severity,
                "source", "agent_schedule",
                "scheduleId", String.valueOf(schedule.getId()));
        SingleAlert singleAlert = SingleAlert.builder()
                .status(status)
                .labels(labels)
                .annotations(succeeded ? Map.of() : Map.of("error", content))
                .content(content)
                .triggerTimes(1)
                .startAt(startAt)
                .activeAt(startAt)
                .endAt(endAt)
                .build();
        return GroupAlert.builder()
                .status(status)
                .groupLabels(Map.of("source", "agent_schedule",
                        "scheduleId", String.valueOf(schedule.getId())))
                .commonLabels(labels)
                .commonAnnotations(Map.of(
                        "scheduleName", schedule.getName(),
                        "runUid", run.getRunUid(),
                        "resultStatus", succeeded ? "SUCCEEDED" : "FAILED",
                        "triggeredAt", String.valueOf(schedule.getLastTriggerAt())))
                .alerts(List.of(singleAlert))
                .build();
    }
}
