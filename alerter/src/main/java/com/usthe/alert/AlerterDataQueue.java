package com.usthe.alert;

import com.usthe.common.entity.alerter.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * 采集数据队列
 * @author tom
 * @date 2021/11/24 17:58
 */
@Component
@Slf4j
public class AlerterDataQueue {

    private final LinkedBlockingQueue<Alert> alertDataQueue;

    public AlerterDataQueue() {
        alertDataQueue = new LinkedBlockingQueue<>();
    }

    public void addAlertData(Alert alert) {
        alertDataQueue.offer(alert);
    }

    public Alert pollAlertData() throws InterruptedException {
        return alertDataQueue.poll(2, TimeUnit.SECONDS);
    }

}
