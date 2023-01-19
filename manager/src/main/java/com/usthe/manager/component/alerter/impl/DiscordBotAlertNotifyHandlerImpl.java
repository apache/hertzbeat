package com.usthe.manager.component.alerter.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.support.exception.AlertNoticeException;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/1/19
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DiscordBotAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    @Override
    public void send(NoticeReceiver receiver, Alert alert) throws AlertNoticeException {
        try {
            var notifyBody = DiscordNotifyDTO.builder()
                    .embeds(List.of(EmbedDTO.builder()
                            .title("[" + bundle.getString("alerter.notify.title") + "]")
                            .description(renderContent(alert))
                            .build()))
                    .build();

            var url = String.format(alerterProperties.getDiscordNotifyUrl(), receiver.getDiscordChannelId());
            var headers = new HttpHeaders();
            headers.add("Authorization", "Bot " + receiver.getDiscordBotToken());
            var request = new HttpEntity<>(notifyBody, headers);
            var entity = restTemplate.postForEntity(url, request, DiscordResponseDTO.class);
            if (entity.getStatusCode() == HttpStatus.OK && entity.getBody() != null) {
                var body = entity.getBody();
                if (body.id != null) {
                    log.debug("Send Discord Bot Success");
                } else {
                    log.warn("Send Discord Bot Failed: {}, error_code: {}", body.code, body.message);
                    throw new AlertNoticeException(body.message);
                }
            } else {
                log.warn("Send Discord Bot Failed {}", entity.getBody());
                throw new AlertNoticeException("Http StatusCode " + entity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Discord Bot Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 9;
    }

    @Override
    protected String templateName() {
        return "alertNotifyDiscordBot";
    }

    @Data
    @Builder
    private static class DiscordNotifyDTO {
        private List<EmbedDTO> embeds;
    }

    @Data
    @Builder
    private static class EmbedDTO {
        private String title;
        private String description;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class DiscordResponseDTO {
        private String id;
        private Integer type;
        private String content;
        private String message;
        private Integer code;
    }

}
