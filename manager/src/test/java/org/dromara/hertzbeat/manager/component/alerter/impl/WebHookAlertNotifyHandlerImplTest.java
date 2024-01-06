package org.dromara.hertzbeat.manager.component.alerter.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * Test case for {@link WebHookAlertNotifyHandlerImpl}
 */
@Slf4j
class WebHookAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private WebHookAlertNotifyHandlerImpl webHookAlertNotifyHandler;

    @BeforeEach
    void setUp() {
    }

    @Test
    void send() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        NoticeTemplate noticeTemplate = new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("webhook");
        noticeTemplate.setContent("{\n" +
                "  \"alarmId\": ${alarmId},\n" +
                "  \"target\": \"${target}\",\n" +
                "  <#if (thresholdId??)>\"thresholdId\": ${thresholdId},</#if>\n" +
                "  \"priority\": ${priorityValue},\n" +
                "  \"content\": \"${content}\",\n" +
                "  \"status\": ${status},\n" +
                "  \"times\": ${times},\n" +
                "  \"triggerTime\": \"${triggerTime}\",\n" +
                "  <#if (restoreTime??)>\"restoreTime\": \"${restoreTime}\",</#if>\n" +
                "  <#if (tags??)>\n" +
                "  \"tags\": {\n" +
                "    <#list tags as key,value>\n" +
                "    \"${key}\": \"${value}\",\n" +
                "    </#list>\n" +
                "  }\n" +
                "  </#if>\n" +
                "}\n");
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_NAME, null);
        map.put(null, null);
//        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        alert.setTags(map);
        alert.setTimes(1);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        webHookAlertNotifyHandler.send(receiver, noticeTemplate, alert);
    }

    @Test
    void type() {
    }
}