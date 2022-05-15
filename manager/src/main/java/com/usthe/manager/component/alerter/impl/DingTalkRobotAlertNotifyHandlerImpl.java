package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
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

import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Send alarm information through DingTalk robot
 * 通过钉钉机器人发送告警信息
 *
 *
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DingTalkRobotAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        DingTalkWebHookDto dingTalkWebHookDto = new DingTalkWebHookDto();
        DingTalkWebHookDto.MarkdownDTO markdownDTO = new DingTalkWebHookDto.MarkdownDTO();
        StringBuilder contentBuilder = new StringBuilder("#### [TanCloud探云告警通知]\n##### **告警目标对象** : " +
                alert.getTarget() + "\n   ");
        if (monitorId != null) {
            contentBuilder.append("##### **所属监控ID** : ").append(monitorId)
                .append("\n   ");
        }
        if (monitorName != null) {
            contentBuilder.append("##### **所属监控名称** : ").append(monitorName)
                .append("\n   ");
        }
        contentBuilder.append("##### **告警级别** : ")
            .append(CommonUtil.transferAlertPriority(alert.getPriority()))
            .append("\n   ");
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        contentBuilder.append("##### **告警触发时间** : ")
                .append(triggerTime)
                .append("\n   ");
        contentBuilder.append("##### **内容详情** : ").append(alert.getContent());
        markdownDTO.setText(contentBuilder.toString());
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
