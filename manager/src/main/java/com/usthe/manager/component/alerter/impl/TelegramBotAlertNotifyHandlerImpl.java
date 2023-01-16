package com.usthe.manager.component.alerter.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.ResourceBundleUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ResourceBundle;

/**
 * Send alarm information by Telegram Bot
 * 通过Telegram Bot发送告警信息
 *
 *
 * @version 2.1
 * Created by Musk.Chen on 2023/1/16
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class TelegramBotAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final RestTemplate restTemplate;
    private final ResourceBundle bundle = ResourceBundleUtil.getBundle("alerter");
    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final String TG_BOT_URL_TEMPLATE = "https://api.telegram.org/bot%s/sendMessage";

    @Override
    public void send(NoticeReceiver receiver, Alert alert) throws AlertNoticeException {
        String url = String.format(TG_BOT_URL_TEMPLATE, receiver.getTgBotToken());
        TelegramBotNotifyDTO notifyBody = TelegramBotNotifyDTO.builder()
                .chatId(receiver.getTgUserId())
                .text(buildMessage(alert))
                .disableWebPagePreview(true)
                .build();
        try {
            ResponseEntity<TelegramBotNotifyResponse> entity = restTemplate.postForEntity(url, notifyBody, TelegramBotNotifyResponse.class);
            if (entity.getStatusCode() == HttpStatus.OK && entity.getBody() != null) {
                TelegramBotNotifyResponse body = entity.getBody();
                if (body.ok) {
                    log.debug("Send Telegram Bot Success");
                } else {
                    log.warn("Send Telegram Bot Failed: {}, error_code: {}", body.description, body.errorCode);
                    throw new AlertNoticeException(body.description);
                }
            } else {
                log.warn("Send Telegram Bot Failed {}", entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Telegram Bot Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 7;
    }

    private String buildMessage(Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
        StringBuilder content = new StringBuilder();
        content.append("[").append(bundle.getString("alerter.notify.title")).append("]\n")
                .append(bundle.getString("alerter.notify.target")).append(" : ").append(alert.getTarget()).append("\n");
        if (StringUtils.hasText(monitorId)) {
            content.append(bundle.getString("alerter.notify.monitorId")).append(" : ")
                    .append(monitorId).append("\n");
        }
        if (StringUtils.hasText(monitorName)) {
            content.append(bundle.getString("alerter.notify.monitorName")).append(" : ")
                    .append(monitorName).append("\n");
        }
        if (alert.getPriority() < CommonConstants.ALERT_PRIORITY_CODE_WARNING) {
            content.append(bundle.getString("alerter.notify.priority")).append(" : ")
                    .append(bundle.getString("alerter.priority." + alert.getPriority())).append("\n");
        } else {
            content.append(bundle.getString("alerter.notify.priority")).append(" : ")
                    .append(bundle.getString("alerter.priority." + alert.getPriority())).append("\n");
        }
        String triggerTime = DTF.format(Instant.ofEpochMilli(alert.getLastTriggerTime()).atZone(ZoneId.systemDefault()).toLocalDateTime());
        content.append(bundle.getString("alerter.notify.triggerTime")).append(" : ")
                .append(triggerTime).append("\n");
        content.append(bundle.getString("alerter.notify.content")).append(" : ").append(alert.getContent());

        return content.toString();
    }

    @Data
    @Builder
    private static class TelegramBotNotifyDTO {
        @JsonProperty("chat_id")
        private String chatId;
        private String text;
        @JsonProperty("disable_web_page_preview")
        private Boolean disableWebPagePreview;
    }

    @NoArgsConstructor
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class TelegramBotNotifyResponse {
        private boolean ok;
        @JsonProperty("error_code")
        private Integer errorCode;
        private String description;
    }

}
