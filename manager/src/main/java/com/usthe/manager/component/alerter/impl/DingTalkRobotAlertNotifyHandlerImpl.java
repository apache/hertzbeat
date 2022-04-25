package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.pojo.dto.DingTalkWebHookDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

/**
 * Send alarm information through DingTalk robot
 * 通过钉钉机器人发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DingTalkRobotAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        DingTalkWebHookDto dingTalkWebHookDto = new DingTalkWebHookDto();
        DingTalkWebHookDto.MarkdownDTO markdownDTO = new DingTalkWebHookDto.MarkdownDTO();
        String content = "#### [TanCloud探云告警通知]\n##### **告警目标对象** : " +
                alert.getTarget() + "\n   " +
                "##### **所属监控ID** : " + alert.getMonitorId() + "\n   " +
                "##### **所属监控名称** : " + alert.getMonitorName() + "\n   " +
                "##### **告警级别** : " +
                CommonUtil.transferAlertPriority(alert.getPriority()) + "\n   " +
                "##### **内容详情** : " + alert.getContent();
        markdownDTO.setText(content);
        markdownDTO.setTitle("TanCloud探云告警通知");
        dingTalkWebHookDto.setMarkdown(markdownDTO);
        String webHookUrl = DingTalkWebHookDto.WEBHOOK_URL + receiver.getAccessToken();
        try {
            ResponseEntity<String> entity = restTemplate.postForEntity(webHookUrl, dingTalkWebHookDto, String.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send dingTalk webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send dingTalk webHook: {} Failed: {}", webHookUrl, entity.getBody());
            }
        } catch (ResourceAccessException e) {
            log.warn("Send dingTalk: {} Failed: {}.", webHookUrl, e.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public byte type() {
        return 5;
    }
}
