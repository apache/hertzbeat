package com.usthe.manager.component.alerter.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Send alarm information by Telegram Bot
 * 通过Telegram Bot发送告警信息
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/16
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class TelegramBotAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) throws AlertNoticeException {
        try {
            String url = String.format(alerterProperties.getTelegramBotApiUrl(), receiver.getTgBotToken());
            TelegramBotNotifyDTO notifyBody = TelegramBotNotifyDTO.builder()
                    .chatId(receiver.getTgUserId())
                    .text(renderContent(alert))
                    .disableWebPagePreview(true)
                    .build();
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

    @Override
    protected String templateName() {
        return "alertNotifyTelegramBot";
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
