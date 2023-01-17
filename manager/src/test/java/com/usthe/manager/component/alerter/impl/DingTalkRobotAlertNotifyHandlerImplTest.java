package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
import com.usthe.manager.AbstractSpringIntegrationTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * Test case for {@link DingTalkRobotAlertNotifyHandlerImpl}
 */
@Slf4j
class DingTalkRobotAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private DingTalkRobotAlertNotifyHandlerImpl dingTalkRobotAlertNotifyHandler;

    @Test
    void send() {
        String ddAccessToken = System.getenv("DD_ACCESS_TOKEN");
        if (!StringUtils.hasText(ddAccessToken)) {
            log.warn("Please provide environment variables DD_ACCESS_TOKEN");
            return;
        }
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setAccessToken(ddAccessToken);
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

        dingTalkRobotAlertNotifyHandler.send(receiver, alert);
    }

}