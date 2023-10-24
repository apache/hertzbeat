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

package org.dromara.hertzbeat.manager.component.alerter;

import com.google.common.collect.Maps;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.AlerterWorkerPool;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.queue.CommonDataQueue;
import org.dromara.hertzbeat.manager.service.NoticeConfigService;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.dromara.hertzbeat.manager.support.exception.IgnoreException;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Alarm information storage and distribution
 * 告警信息入库分发
 *
 * @author tom
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

    public DispatcherAlarm(AlerterWorkerPool workerPool,
                           CommonDataQueue dataQueue,
                           NoticeConfigService noticeConfigService,
                           AlertStoreHandler alertStoreHandler,
                           List<AlertNotifyHandler> alertNotifyHandlerList) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.noticeConfigService = noticeConfigService;
        this.alertStoreHandler = alertStoreHandler;
        alertNotifyHandlerMap = Maps.newHashMapWithExpectedSize(alertNotifyHandlerList.size());
        alertNotifyHandlerList.forEach(r -> alertNotifyHandlerMap.put(r.type(), r));
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        // 启动报警分发
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
            alertNotifyHandlerMap.get(type).send(receiver, noticeTemplate, alert);
            return true;
        }
        return false;
    }

    private NoticeReceiver getOneReceiverById(Long id) {
        return noticeConfigService.getOneReceiverById(id);
    }

    private NoticeTemplate getOneTemplateById(Long id) {
        return noticeConfigService.getOneTemplateById(id);
    }

    private List<NoticeRule> matchNoticeRulesByAlert(Alert alert) {
        return noticeConfigService.getReceiverFilterRule(alert);
    }

    private class DispatchTask implements Runnable {

        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Alert alert = dataQueue.pollAlertsData();
                    if (alert != null) {
                        // Determining alarm type storage   判断告警类型入库
                        alertStoreHandler.store(alert);
                        // 通知分发
                        sendNotify(alert);
                    }
                } catch (IgnoreException ignored) {
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                } catch (Exception exception) {
                    log.error(exception.getMessage(), exception);
                }
            }
        }

        private void sendNotify(Alert alert) {
            List<NoticeRule> noticeRules = matchNoticeRulesByAlert(alert);
            // todo Send notification here temporarily single thread     发送通知这里暂时单线程
            if (noticeRules != null) {
                for (NoticeRule rule : noticeRules) {
                    try {
                        if (rule.getTemplateId() == null) {
                            sendNoticeMsg(getOneReceiverById(rule.getReceiverId()),
                                    null, alert);
                        } else {
                            sendNoticeMsg(getOneReceiverById(rule.getReceiverId()),
                                    getOneTemplateById(rule.getTemplateId()), alert);
                        }
                    } catch (AlertNoticeException e) {
                        log.warn("DispatchTask sendNoticeMsg error, message: {}", e.getMessage());
                    }
                }
            }
        }
    }

}
