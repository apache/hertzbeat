package com.usthe.manager.component.alerter;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
public interface AlertNotifyHandler {

    /**
     * 发送报警通知
     *
     * @param receiver Notification configuration information   通知配置信息
     * @param alert    Alarm information                        告警信息
     */
    void send(NoticeReceiver receiver, Alert alert);

    /**
     * 通知类型
     *
     * @return 通知类型
     */
    byte type();
}
