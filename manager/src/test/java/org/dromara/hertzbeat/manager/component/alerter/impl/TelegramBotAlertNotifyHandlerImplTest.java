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
import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/16
 */
@Slf4j
class TelegramBotAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private TelegramBotAlertNotifyHandlerImpl telegramBotAlertNotifyHandler;

    @Test
    void send() {
        String tgBotToken = System.getenv("TG_BOT_TOKEN");
        String tgUserId = System.getenv("TG_USER_ID");
        if (!StringUtils.hasText(tgBotToken) || !StringUtils.hasText(tgUserId)) {
            log.warn("Please provide environment variables TG_BOT_TOKEN, TG_USER_ID");
            return;
        }
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setTgBotToken(tgBotToken);
        receiver.setTgUserId(tgUserId);
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        NoticeTemplate noticeTemplate=new NoticeTemplate();
        noticeTemplate.setId(1L);
        noticeTemplate.setName("Telegram");
        noticeTemplate.setContent("[${title}]\n" +
                "${targetLabel} : ${target}\n" +
                "<#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>\n" +
                "<#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>\n" +
                "${priorityLabel} : ${priority}\n" +
                "${triggerTimeLabel} : ${triggerTime}\n" +
                "${contentLabel} : ${content}");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        map.put(CommonConstants.TAG_MONITOR_NAME, "Mock monitor name");
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastAlarmTime(System.currentTimeMillis());

        telegramBotAlertNotifyHandler.send(receiver, noticeTemplate,alert);
    }
}
