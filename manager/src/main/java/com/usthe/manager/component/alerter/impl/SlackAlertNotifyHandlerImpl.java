package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Objects;

/**
 * Send alarm information by Slack Webhook
 * 通过Slack Webhook发送告警信息
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/17
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class SlackAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    private static final String SUCCESS = "ok";
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) throws AlertNoticeException {
        try {
            var slackNotify = SlackNotifyDTO.builder()
                    .text(renderContent(alert))
                    .build();

            var entity = restTemplate.postForEntity(receiver.getSlackWebHookUrl(), slackNotify, String.class);
            if (entity.getStatusCode() == HttpStatus.OK && entity.getBody() != null) {
                var body = entity.getBody();
                if (Objects.equals(SUCCESS, body)) {
                    log.debug("Send Slack Success");
                } else {
                    log.warn("Send Slack Failed: {}", body);
                    throw new AlertNoticeException(body);
                }
            } else {
                log.warn("Send Slack Failed {}", entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Slack Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 8;
    }

    @Override
    protected String templateName() {
        return "alertNotifySlack";
    }

    @Data
    @Builder
    private static class SlackNotifyDTO {
        private String text;
    }

}
