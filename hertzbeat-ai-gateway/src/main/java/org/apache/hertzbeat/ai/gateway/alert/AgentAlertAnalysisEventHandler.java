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

package org.apache.hertzbeat.ai.gateway.alert;

import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.ReplyMode;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommandRouter;
import org.apache.hertzbeat.ai.gateway.channel.core.ChannelId;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentResponseLanguage;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Groups persisted single-alert facts and routes qualifying incidents through the standard Gateway command path.
 */
@Slf4j
@Component
public class AgentAlertAnalysisEventHandler {

    private static final String ALERT_ANALYSIS_PROMPT_TEMPLATE = """
            Analyze this HertzBeat alert incident. Correlate the alerts, gather relevant monitoring evidence with \
            tools, identify likely causes, and provide prioritized checks. Incident context:
            %s""";

    private final AlertAnalysisPolicyService policyService;
    private final GatewayCommandRouter commandRouter;
    private final Map<String, AnalysisWindow> windows = new ConcurrentHashMap<>();
    private final ExecutorService executor = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(256), Thread.ofPlatform().name("agent-alert-analysis-", 0).factory(),
            new ThreadPoolExecutor.AbortPolicy());

    public AgentAlertAnalysisEventHandler(AlertAnalysisPolicyService policyService,
                                          GatewayCommandRouter commandRouter) {
        this.policyService = policyService;
        this.commandRouter = commandRouter;
    }

    @EventListener
    public void onSingleAlertCreated(SingleAlert.CreatedEvent event) {
        SingleAlert alert = event.alert();
        if (alert == null || !CommonConstants.ALERT_STATUS_FIRING.equals(alert.getStatus())) {
            return;
        }
        try {
            executor.execute(() -> process(alert.clone()));
        } catch (RuntimeException exception) {
            log.warn("Agent alert analysis input was rejected for alert {}", alert.getFingerprint(), exception);
        }
    }

    private void process(SingleAlert alert) {
        for (AlertAnalysisPolicy policy : policyService.findEnabled()) {
            if (matches(policy, alert)) {
                accept(policy, alert);
            }
        }
    }

    private void accept(AlertAnalysisPolicy policy, SingleAlert alert) {
        String group = groupKey(policy.getGroupByLabels(), alert.getLabels());
        if (group == null) {
            return;
        }
        long now = System.currentTimeMillis();
        String windowKey = policy.getId() + ":" + group;
        AnalysisTrigger trigger;
        synchronized (windows.computeIfAbsent(windowKey, ignored -> new AnalysisWindow(now))) {
            AnalysisWindow window = windows.get(windowKey);
            if (now - window.firstSeenAt > TimeUnit.SECONDS.toMillis(policy.getWindowSeconds())) {
                window.reset(now);
            }
            window.alerts.put(alertKey(alert), alert.clone());
            if (now - window.lastTriggeredAt < TimeUnit.SECONDS.toMillis(policy.getCooldownSeconds())
                    || window.alerts.size() < policy.getMinimumAlertCount()) {
                return;
            }
            window.lastTriggeredAt = now;
            trigger = new AnalysisTrigger(policy, group, window.firstSeenAt,
                    List.copyOf(window.alerts.values()), alert);
            window.alerts.clear();
            window.firstSeenAt = now;
        }
        invoke(trigger);
    }

    private void invoke(AnalysisTrigger trigger) {
        String contextHash = GatewayText.sha256(trigger.policy().getId() + ":" + trigger.groupKey()
                + ":" + trigger.firstSeenAt());
        String conversationId = "alert-analysis:" + contextHash;
        String commandId = "alert_" + GatewayText.sha256(conversationId + ":"
                + alertKey(trigger.triggerAlert())).substring(0, 32);
        List<Long> alertIds = trigger.alerts().stream()
                .map(SingleAlert::getId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .limit(256)
                .toList();
        long now = System.currentTimeMillis();
        UserInput userInput = UserInput.builder()
                .messageId(commandId)
                .conversationId(conversationId)
                .target(AgentTargetRef.builder().alertId(trigger.triggerAlert().getId()).build())
                .alertIncident(AgentAlertIncidentContext.builder()
                        .analysisPolicyId(trigger.policy().getId())
                        .triggerAlertId(trigger.triggerAlert().getId())
                        .alertIds(alertIds)
                        .alertCount(trigger.alerts().size())
                        .windowStartedAt(trigger.firstSeenAt())
                        .build())
                .message(UserInput.Message.builder().text(prompt(trigger)).build())
                .build();
        InvokeCommand command = InvokeCommand.builder()
                .envelope(GatewayEnvelope.builder()
                        .channelId(ChannelId.ALERT.id())
                        .receivedAt(now)
                        .actor(AgentActor.alertAnalysisActor())
                        .preferredLanguage(AgentResponseLanguage.systemDefault())
                        .build())
                .replyMode(ReplyMode.FINAL_ONLY)
                .commandId(commandId)
                .userInput(userInput)
                .entryType(AgentRuntimeEntryType.ALERT_TRIGGER)
                .build();
        try {
            commandRouter.handle(command);
        } catch (RuntimeException exception) {
            log.error("Automatic alert analysis failed for policy {} and conversation {}",
                    trigger.policy().getId(), conversationId, exception);
        }
    }

    private String prompt(AnalysisTrigger trigger) {
        List<Map<String, Object>> alerts = new ArrayList<>(trigger.alerts().size());
        for (SingleAlert alert : trigger.alerts()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", alert.getId());
            item.put("status", alert.getStatus());
            item.put("labels", alert.getLabels());
            item.put("annotations", alert.getAnnotations());
            item.put("content", alert.getContent());
            item.put("startAt", alert.getStartAt());
            item.put("activeAt", alert.getActiveAt());
            item.put("triggerTimes", alert.getTriggerTimes());
            alerts.add(item);
        }
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("analysisPolicyId", trigger.policy().getId());
        context.put("analysisPolicyName", trigger.policy().getName());
        context.put("groupByLabels", trigger.policy().getGroupByLabels());
        context.put("groupKey", trigger.groupKey());
        context.put("windowStartedAt", trigger.firstSeenAt());
        context.put("alerts", alerts);
        return ALERT_ANALYSIS_PROMPT_TEMPLATE.formatted(JsonUtil.toJson(context));
    }

    private boolean matches(AlertAnalysisPolicy policy, SingleAlert alert) {
        Map<String, String> labels = alert.getLabels();
        if (labels == null) {
            return false;
        }
        return policy.getMatchLabels().entrySet().stream()
                .allMatch(entry -> entry.getValue().equals(labels.get(entry.getKey())));
    }

    private String groupKey(List<String> groupByLabels, Map<String, String> labels) {
        if (labels == null) {
            return null;
        }
        List<String> components = new ArrayList<>(groupByLabels.size());
        for (String label : groupByLabels) {
            String value = labels.get(label);
            if (value == null) {
                return null;
            }
            components.add(label + "=" + value);
        }
        components.sort(Comparator.naturalOrder());
        return String.join(",", components);
    }

    private String alertKey(SingleAlert alert) {
        return alert.getId() == null ? alert.getFingerprint() : String.valueOf(alert.getId());
    }

    @PreDestroy
    public void destroy() {
        executor.shutdownNow();
    }

    private static final class AnalysisWindow {
        private final Map<String, SingleAlert> alerts = new LinkedHashMap<>();
        private long firstSeenAt;
        private long lastTriggeredAt;

        private AnalysisWindow(long firstSeenAt) {
            this.firstSeenAt = firstSeenAt;
        }

        private void reset(long now) {
            alerts.clear();
            firstSeenAt = now;
        }
    }

    private record AnalysisTrigger(AlertAnalysisPolicy policy, String groupKey, long firstSeenAt,
                                   List<SingleAlert> alerts, SingleAlert triggerAlert) {
    }
}
