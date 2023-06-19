package org.dromara.hertzbeat.manager.component.alerter.impl;

import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * Test case for {@link WeWorkRobotAlertNotifyHandlerImpl}
 */
@Slf4j
class WeWorkRobotAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private WeWorkRobotAlertNotifyHandlerImpl weWorkRobotAlertNotifyHandler;

    @Test
    void send() {
        String weWorkKey = System.getenv("WE_WORK_KEY");
        if (!StringUtils.hasText(weWorkKey)) {
            log.warn("Please provide environment variables WE_WORK_KEY");
            return;
        }
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setWechatId(weWorkKey);
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        map.put(CommonConstants.TAG_MONITOR_NAME, "Mock monitor name");
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        weWorkRobotAlertNotifyHandler.send(receiver, alert);
    }

}
