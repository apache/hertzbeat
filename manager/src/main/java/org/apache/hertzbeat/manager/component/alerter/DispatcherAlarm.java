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

package org.apache.hertzbeat.manager.component.alerter;

import com.google.common.collect.Maps;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.NoticeReceiver;
import org.apache.hertzbeat.common.entity.manager.NoticeRule;
import org.apache.hertzbeat.common.entity.manager.NoticeTemplate;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.manager.service.NoticeConfigService;
import org.apache.hertzbeat.manager.support.exception.AlertNoticeException;
import org.apache.hertzbeat.manager.support.exception.IgnoreException;
import org.apache.hertzbeat.plugin.PostAlertPlugin;
import org.apache.hertzbeat.plugin.Plugin;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 * Alarm information storage and distribution
 */
@Component
@Slf4j
public class DispatcherAlarm implements InitializingBean {

    private static final int DISPATCH_THREADS = 3;

    private final AlerterWorkerPool workerPool;
    private final CommonDataQueue dataQueue;
    private final NoticeConfigService noticeConfigService;
    private final AlertStoreHandler alertStoreHandler;
    private final Map<Byte, AlertNotifyHandler> alertNotifyHandlerMap;
    private final PluginRunner pluginRunner;

    public DispatcherAlarm(AlerterWorkerPool workerPool,
        CommonDataQueue dataQueue,
        NoticeConfigService noticeConfigService,
        AlertStoreHandler alertStoreHandler,
        List<AlertNotifyHandler> alertNotifyHandlerList, PluginRunner pluginRunner) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.noticeConfigService = noticeConfigService;
        this.alertStoreHandler = alertStoreHandler;
        this.pluginRunner = pluginRunner;
        alertNotifyHandlerMap = Maps.newHashMapWithExpectedSize(alertNotifyHandlerList.size());
        alertNotifyHandlerList.forEach(r -> alertNotifyHandlerMap.put(r.type(), r));
    }

    @Override
    public void afterPropertiesSet() {
        // Start alarm distribution
        DispatchTask dispatchTask = new DispatchTask();
        for (int i = 0; i < DISPATCH_THREADS; i++) {
            workerPool.executeJob(dispatchTask);
        }
    }

    /**
     * send alert msg to receiver
     *
     * @param receiver receiver
     * @param alert    alert msg
     * @return send success or failed
     */
    public boolean sendNoticeMsg(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
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
            if (noticeTemplate == null) {
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

    private Optional<List<NoticeRule>> matchNoticeRulesByAlert(Alert alert) {
        return Optional.ofNullable(noticeConfigService.getReceiverFilterRule(alert));
    }

    private class DispatchTask implements Runnable {

        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Alert alert = dataQueue.pollAlertsData();
                    if (alert != null) {
                        // Determining alarm type storage
                        alertStoreHandler.store(alert);
                        if (alert.getTags() != null && alert.getTags().containsKey(CommonConstants.TAG_COLLECTOR_NAME)){
                            continue;
                        }
                        // Notice distribution
                        sendNotify(alert);
                        // Execute the plugin if enable (Compatible with old version plugins, will be removed in later versions)
                        pluginRunner.pluginExecute(Plugin.class, plugin -> plugin.alert(alert));
                        // Execute the plugin if enable with params
                        pluginRunner.pluginExecute(PostAlertPlugin.class, (afterAlertPlugin, pluginContext) -> afterAlertPlugin.execute(alert, pluginContext));

                    }
                } catch (IgnoreException ignored) {
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.error(e.getMessage());
                } catch (Exception exception) {
                    log.error(exception.getMessage(), exception);
                }
            }
        }

        private void sendNotify(Alert alert) {
            matchNoticeRulesByAlert(alert).ifPresent(noticeRules -> noticeRules.forEach(rule -> {
                workerPool.executeNotify(() -> {
                    rule.getReceiverId()
                        .forEach(receiverId -> {
                            try {
                                sendNoticeMsg(getOneReceiverById(receiverId),
                                    getOneTemplateById(rule.getTemplateId()), alert);
                            } catch (AlertNoticeException e) {
                                log.warn("DispatchTask sendNoticeMsg error, message: {}", e.getMessage());
                            }
                        });
                });
            }));
        }
    }

}
