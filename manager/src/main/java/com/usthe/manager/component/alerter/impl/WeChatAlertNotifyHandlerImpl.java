package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.component.alerter.AlertNotifyHandler;

/**
 *
 * @since 2022/4/24
 */
final class WeChatAlertNotifyHandlerImpl implements AlertNotifyHandler {
    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        // todo
    }

    @Override
    public byte type() {
        return 3;
    }
}
