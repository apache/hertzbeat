package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.component.alerter.AlertNotifyHandler;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
final class SmsAlertNotifyHandlerImpl implements AlertNotifyHandler {
    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        // todo SMS notification    短信通知
    }

    @Override
    public byte type() {
        return 0;
    }
}
