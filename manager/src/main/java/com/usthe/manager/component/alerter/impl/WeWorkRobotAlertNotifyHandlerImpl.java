package com.usthe.manager.component.alerter.impl;

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

/**
 * Send alarm information through enterprise WeChat
 * 通过企业微信发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class WeWorkRobotAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        WeWorkWebHookDto weWorkWebHookDTO = new WeWorkWebHookDto();
        WeWorkWebHookDto.MarkdownDTO markdownDTO = new WeWorkWebHookDto.MarkdownDTO();
        StringBuilder content = new StringBuilder();
        content.append("<font color=\"info\">[TanCloud探云告警通知]</font>\n告警目标对象 : <font color=\"info\">")
                .append(alert.getTarget()).append("</font>\n")
                .append("所属监控ID : ").append(alert.getMonitorId()).append("\n")
                .append("所属监控名称 : ").append(alert.getMonitorName()).append("\n");
        if (alert.getPriority() < CommonConstants.ALERT_PRIORITY_CODE_WARNING) {
            content.append("告警级别 : <font color=\"warning\">")
                    .append(CommonUtil.transferAlertPriority(alert.getPriority())).append("</font>\n");
        } else {
            content.append("告警级别 : <font color=\"comment\">")
                    .append(CommonUtil.transferAlertPriority(alert.getPriority())).append("</font>\n");
        }
        content.append("内容详情 : ").append(alert.getContent());
        markdownDTO.setContent(content.toString());
        weWorkWebHookDTO.setMarkdown(markdownDTO);
        String webHookUrl = WeWorkWebHookDto.WEBHOOK_URL + receiver.getWechatId();
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
