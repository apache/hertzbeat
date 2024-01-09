package org.dromara.hertzbeat.manager.component.alerter.impl;

import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.Map;

/**
 * Test case for {@link SlackAlertNotifyHandlerImpl}
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/17
 */
@Slf4j
class SlackAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private SlackAlertNotifyHandlerImpl slackAlertNotifyHandler;

    @Test
    void send() {
        var slackWebHook = System.getenv("SLACK_WEB_HOOK");
        if (!StringUtils.hasText(slackWebHook)) {
            log.warn("Please provide environment variables SLACK_WEB_HOOK");
            return;
        }
        var receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setSlackWebHookUrl(slackWebHook);
        var alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        var noticeTemplate=new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("Slack");
        noticeTemplate.setContent("*[${title}]*\n" +
                "${targetLabel} : ${target}\n" +
                "<#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>\n" +
                "<#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>\n" +
                "${priorityLabel} : ${priority}\n" +
                "${triggerTimeLabel} : ${triggerTime}\n" +
                "${contentLabel} : ${content}");
        var map = Map.of(
                CommonConstants.TAG_MONITOR_ID, "Mock monitor id",
                CommonConstants.TAG_MONITOR_NAME, "Mock monitor name"
        );
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        slackAlertNotifyHandler.send(receiver, noticeTemplate,alert);
    }
}
