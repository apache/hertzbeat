package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.ResourceBundleUtil;
import com.usthe.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import javax.annotation.Resource;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * Test case for {@link DingTalkRobotAlertNotifyHandlerImpl}
 */
class DingTalkRobotAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private DingTalkRobotAlertNotifyHandlerImpl dingTalkRobotAlertNotifyHandler;

    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");

    @Test
    void send() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
//        receiver.setTgBotToken(tgBotToken);
//        receiver.setTgUserId(tgUserId);
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        map.put(CommonConstants.TAG_MONITOR_NAME, "Mock monitor name");
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastTriggerTime(System.currentTimeMillis());

        Assertions.assertEquals(buildMessage(alert), dingTalkRobotAlertNotifyHandler.renderContext(alert));
    }

    private String buildMessage(Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        StringBuilder contentBuilder = new StringBuilder("#### [" + bundle.getString("alerter.notify.title")
                + "]\n##### **" + bundle.getString("alerter.notify.target") + "** : " +
                alert.getTarget() + "\n   ");
        if (monitorId != null) {
            contentBuilder.append("##### **").append(bundle.getString("alerter.notify.monitorId"))
                    .append("** : ").append(monitorId).append("\n   ");
        }
        if (monitorName != null) {
            contentBuilder.append("##### **").append(bundle.getString("alerter.notify.monitorName"))
                    .append("** : ").append(monitorName).append("\n   ");
        }
        contentBuilder.append("##### **").append(bundle.getString("alerter.notify.priority"))
                .append("** : ").append(bundle.getString("alerter.priority." + alert.getPriority())).append("\n   ");
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        contentBuilder.append("##### **").append(bundle.getString("alerter.notify.triggerTime"))
                .append("** : ").append(triggerTime).append("\n   ");
        contentBuilder.append("##### **").append(bundle.getString("alerter.notify.content"))
                .append("** : ").append(alert.getContent());
        return contentBuilder.toString();
    }

}