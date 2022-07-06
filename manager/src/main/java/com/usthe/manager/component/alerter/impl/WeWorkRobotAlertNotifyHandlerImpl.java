package com.usthe.manager.component.alerter.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.pojo.dto.WeWorkWebHookDto;
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
 * Send alarm information through enterprise WeChat
 * 通过企业微信发送告警信息
 *
 *
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class WeWorkRobotAlertNotifyHandlerImpl implements AlertNotifyHandler {

    private final RestTemplate restTemplate;

    private final AlerterProperties alerterProperties;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        WeWorkWebHookDto weWorkWebHookDTO = new WeWorkWebHookDto();
        WeWorkWebHookDto.MarkdownDTO markdownDTO = new WeWorkWebHookDto.MarkdownDTO();
        StringBuilder content = new StringBuilder();
        content.append("<font color=\"info\">[HertzBeat告警通知]</font>\n告警目标对象 : <font color=\"info\">")
                .append(alert.getTarget()).append("</font>\n");
        if (monitorId != null) {
            content.append("所属监控ID : ").append(monitorId).append("\n");
        }
        if (monitorName != null) {
            content.append("所属监控名称 : ").append(monitorName).append("\n");
        }
        if (alert.getPriority() < CommonConstants.ALERT_PRIORITY_CODE_WARNING) {
            content.append("告警级别 : <font color=\"warning\">")
                    .append(CommonUtil.transferAlertPriority(alert.getPriority())).append("</font>\n");
        } else {
            content.append("告警级别 : <font color=\"comment\">")
                    .append(CommonUtil.transferAlertPriority(alert.getPriority())).append("</font>\n");
        }
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        content.append("告警触发时间 : ").append(triggerTime).append("\n");
        content.append("内容详情 : ").append(alert.getContent());
        markdownDTO.setContent(content.toString());
        weWorkWebHookDTO.setMarkdown(markdownDTO);
        String webHookUrl = alerterProperties.getWeWorkWebHookUrl() + receiver.getWechatId();
        try {
            ResponseEntity<String> entity = restTemplate.postForEntity(webHookUrl, weWorkWebHookDTO, String.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send weWork webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send weWork webHook: {} Failed: {}", webHookUrl, entity.getBody());
            }
        } catch (ResourceAccessException e) {
            log.warn("Send WebHook: {} Failed: {}.", webHookUrl, e.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public byte type() {
        return 4;
    }
}
