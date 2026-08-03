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

package org.apache.hertzbeat.alert.notice;

import com.google.common.collect.Maps;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.RejectedExecutionException;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.plugin.PostAlertPlugin;
import org.apache.hertzbeat.plugin.Plugin;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.springframework.stereotype.Component;

/**
 * Alarm information storage and distribution
 */
@Component
@Slf4j
public class AlertNoticeDispatch {

    private final AlerterWorkerPool workerPool;
    private final NoticeConfigService noticeConfigService;
    private final AlertStoreHandler alertStoreHandler;
    private final Map<Byte, AlertNotifyHandler> alertNotifyHandlerMap;
    private final PluginRunner pluginRunner;
    private final AlertSseManager emitterManager;

    public AlertNoticeDispatch(AlerterWorkerPool workerPool,
                               NoticeConfigService noticeConfigService,
                               AlertStoreHandler alertStoreHandler,
                               List<AlertNotifyHandler> alertNotifyHandlerList, PluginRunner pluginRunner, AlertSseManager emitterManager) {
        this.workerPool = workerPool;
        this.noticeConfigService = noticeConfigService;
        this.alertStoreHandler = alertStoreHandler;
        this.pluginRunner = pluginRunner;
        alertNotifyHandlerMap = Maps.newHashMapWithExpectedSize(alertNotifyHandlerList.size());
        this.emitterManager = emitterManager;
        alertNotifyHandlerList.forEach(r -> alertNotifyHandlerMap.put(r.type(), r));
    }

    /**
     * send alert msg to receiver
     *
     * @param receiver receiver
     * @param alert    alert msg
     * @return send success or failed
     */
    public boolean sendNoticeMsg(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        if (receiver == null || receiver.getType() == null) {
            log.warn("DispatcherAlarm-sendNoticeMsg params is empty alert:[{}], receiver:[{}]", alert, receiver);
            return false;
        }
        byte type = receiver.getType();
        if (alertNotifyHandlerMap.containsKey(type)) {
            AlertNotifyHandler alertNotifyHandler = alertNotifyHandlerMap.get(type);
            if (noticeTemplate == null) {
                noticeTemplate = noticeConfigService.getDefaultNoticeTemplateByType(alertNotifyHandler.type());
            }
            if (noticeTemplate == null && alertNotifyHandler.type() != 0) {
                log.error("alert does not have mapping default notice template. type: {}.", alertNotifyHandler.type());
                throw new NullPointerException(alertNotifyHandler.type() + " does not have mapping default notice template");
            }
            alertNotifyHandler.send(receiver, noticeTemplate, alert);
            return true;
        }
        return false;
    }

    private NoticeReceiver getOneReceiverById(Long id) {
        return noticeConfigService.getReceiverById(id);
    }

    private NoticeTemplate getOneTemplateById(Long id) {
        if (id == null) {
            return null;
        }
        return noticeConfigService.getOneTemplateById(id);
    }

    private Optional<List<NoticeRule>> matchNoticeRulesByAlert(GroupAlert alert) {
        return Optional.ofNullable(noticeConfigService.getReceiverFilterRule(alert));
    }
    
    public void dispatchAlarm(GroupAlert groupAlert) {
        if (groupAlert != null) {
            // Determining alarm type storage
            GroupAlert storedGroupAlert = alertStoreHandler.store(groupAlert);
            // Notice distribution
            sendNotify(storedGroupAlert);
            // Execute the plugin if enable (Compatible with old version plugins, will be removed in later versions)
            pluginRunner.pluginExecute(Plugin.class, plugin -> plugin.alert(storedGroupAlert));
            // Execute the plugin if enable with params
            pluginRunner.pluginExecute(PostAlertPlugin.class, (afterAlertPlugin, pluginContext) -> afterAlertPlugin.execute(storedGroupAlert, pluginContext));
            // Send alert to the sse client
            emitterManager.broadcast(JsonUtil.toJson(storedGroupAlert));
        }
    }

    private void sendNotify(GroupAlert alert) {
        matchNoticeRulesByAlert(alert).ifPresent(noticeRules -> noticeRules.forEach(rule -> {
            NoticeTemplate noticeTemplate = getOneTemplateById(rule.getTemplateId());
            GroupAlert noticeAlert = scopeAlertToRule(alert, rule);
            rule.getReceiverId().forEach(receiverId -> {
                NoticeReceiver receiver = getOneReceiverById(receiverId);
                if (receiver == null || receiver.getType() == null) {
                    log.warn("DispatchTask skip invalid receiver, receiverId: {}, alertId: {}", receiverId, alert.getId());
                    return;
                }
                try {
                    workerPool.executeNotify(receiver.getType(), () -> {
                        try {
                            sendNoticeMsg(receiver, noticeTemplate, noticeAlert);
                        } catch (AlertNoticeException e) {
                            log.warn("DispatchTask sendNoticeMsg error, message: {}", e.getMessage());
                        }
                    });
                } catch (RejectedExecutionException e) {
                    log.warn("DispatchTask rejected notify task, receiverId: {}, type: {}, message: {}",
                            receiverId, receiver.getType(), e.getMessage());
                }
            });
        }));
    }

    private GroupAlert scopeAlertToRule(GroupAlert alert, NoticeRule rule) {
        if (rule.isFilterAll() || rule.getLabels() == null || rule.getLabels().isEmpty()
                || alert.getAlerts() == null) {
            return alert;
        }
        List<SingleAlert> matchingAlerts = alert.getAlerts().stream()
                .filter(singleAlert -> singleAlert.getLabels() != null
                        && rule.getLabels().entrySet().stream().allMatch(label ->
                                Objects.equals(label.getValue(), singleAlert.getLabels().get(label.getKey()))))
                .toList();
        Map<String, String> commonLabels = extractCommonAttributes(matchingAlerts, SingleAlert::getLabels);
        Map<String, String> commonAnnotations =
                extractCommonAttributes(matchingAlerts, SingleAlert::getAnnotations);
        Map<String, String> groupLabels = extractGroupLabels(alert.getGroupLabels(), commonLabels);
        String groupKey = Objects.equals(groupLabels, alert.getGroupLabels())
                ? alert.getGroupKey() : generateGroupKey(groupLabels);
        return GroupAlert.builder()
                .id(alert.getId())
                .groupKey(groupKey)
                .status(determineGroupStatus(matchingAlerts))
                .groupLabels(groupLabels)
                .commonLabels(commonLabels)
                .commonAnnotations(commonAnnotations)
                .alertFingerprints(matchingAlerts.stream()
                        .map(SingleAlert::getFingerprint)
                        .filter(Objects::nonNull)
                        .toList())
                .creator(alert.getCreator())
                .modifier(alert.getModifier())
                .gmtCreate(firstTime(matchingAlerts, SingleAlert::getGmtCreate, alert.getGmtCreate()))
                .gmtUpdate(lastTime(matchingAlerts, SingleAlert::getGmtUpdate, alert.getGmtUpdate()))
                .alerts(matchingAlerts)
                .build();
    }

    private Map<String, String> extractCommonAttributes(
            Collection<SingleAlert> alerts,
            Function<SingleAlert, Map<String, String>> attributes) {
        if (alerts.isEmpty()) {
            return new HashMap<>(0);
        }
        Map<String, String> firstAttributes = attributes.apply(alerts.iterator().next());
        Map<String, String> common =
                firstAttributes == null ? new HashMap<>(0) : new HashMap<>(firstAttributes);
        for (SingleAlert alert : alerts) {
            Map<String, String> current = attributes.apply(alert);
            common.keySet().removeIf(key ->
                    current == null || !current.containsKey(key)
                            || !Objects.equals(common.get(key), current.get(key)));
        }
        return common;
    }

    private Map<String, String> extractGroupLabels(
            Map<String, String> originalGroupLabels,
            Map<String, String> commonLabels) {
        Map<String, String> groupLabels = new HashMap<>();
        if (originalGroupLabels != null) {
            originalGroupLabels.keySet().forEach(key -> {
                if (commonLabels.containsKey(key)) {
                    groupLabels.put(key, commonLabels.get(key));
                }
            });
        }
        return groupLabels;
    }

    private String generateGroupKey(Map<String, String> groupLabels) {
        return groupLabels.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> entry.getKey() + ":" + entry.getValue())
                .collect(Collectors.joining(","));
    }

    private String determineGroupStatus(List<SingleAlert> alerts) {
        return alerts.stream().anyMatch(alert ->
                CommonConstants.ALERT_STATUS_FIRING.equals(alert.getStatus()))
                ? CommonConstants.ALERT_STATUS_FIRING : CommonConstants.ALERT_STATUS_RESOLVED;
    }

    private LocalDateTime firstTime(
            List<SingleAlert> alerts,
            Function<SingleAlert, LocalDateTime> time,
            LocalDateTime fallback) {
        return alerts.stream().map(time).filter(Objects::nonNull)
                .min(LocalDateTime::compareTo).orElse(fallback);
    }

    private LocalDateTime lastTime(
            List<SingleAlert> alerts,
            Function<SingleAlert, LocalDateTime> time,
            LocalDateTime fallback) {
        return alerts.stream().map(time).filter(Objects::nonNull)
                .max(LocalDateTime::compareTo).orElse(fallback);
    }
}
