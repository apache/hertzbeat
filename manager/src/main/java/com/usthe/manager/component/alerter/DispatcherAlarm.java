package com.usthe.manager.component.alerter;

import com.google.common.collect.Maps;
import com.usthe.alert.AlerterDataQueue;
import com.usthe.alert.AlerterWorkerPool;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.service.NoticeConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Alarm information storage and distribution
 * 告警信息入库分发
 *
 * @author tom
 * @date 2021/12/10 12:58
 */
@Component
@Slf4j
public class DispatcherAlarm implements InitializingBean {
    private static final int DISPATCH_THREADS = 3;

    private final AlerterWorkerPool workerPool;
    private final AlerterDataQueue dataQueue;
    private final NoticeConfigService noticeConfigService;
    private final AlertStoreHandler alertStoreHandler;
    private final Map<Byte, AlertNotifyHandler> alertNotifyHandlerMap;

    public DispatcherAlarm(AlerterWorkerPool workerPool,
                           AlerterDataQueue dataQueue,
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

    private List<NoticeReceiver> matchReceiverByNoticeRules(Alert alert) {
        // todo use cache 使用缓存
        return noticeConfigService.getReceiverFilterRule(alert);
    }

    private class DispatchTask implements Runnable {

        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Alert alert = dataQueue.pollAlertData();
                    if (alert != null) {
                        // Determining alarm type storage   判断告警类型入库
                        alertStoreHandler.store(alert);
                        // 通知分发
                        sendNotify(alert);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        }

        private void sendNotify(Alert alert) {
            // todo Forward configured email WeChat webhook              转发配置的邮件 微信 webhook
            List<NoticeReceiver> receivers = matchReceiverByNoticeRules(alert);
            // todo Send notification here temporarily single thread     发送通知这里暂时单线程
            for (NoticeReceiver receiver : receivers) {
                byte type = receiver.getType();
                if (alertNotifyHandlerMap.containsKey(type)) {
                    alertNotifyHandlerMap.get(type).send(receiver, alert);
                }
                // 暂未支持的通知类型
            }
        }

    }
}
