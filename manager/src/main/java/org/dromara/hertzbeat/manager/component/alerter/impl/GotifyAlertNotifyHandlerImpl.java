package org.dromara.hertzbeat.manager.component.alerter.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.*;
import org.springframework.stereotype.Component;

/**
 * Gotify alert notify handler
 *
 * @author zqr10159
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GotifyAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl{

    /**
     * 发送报警通知
     *
     * @param receiver       Notification configuration information   通知配置信息
     * @param noticeTemplate Notification configuration information   通知配置信息
     * @param alert          Alarm information                        告警信息
     * @throws AlertNoticeException when send receiver error
     */
    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) throws AlertNoticeException {
        try {
            GotifyWebHookDto gotifyWebHookDto = new GotifyWebHookDto();
            gotifyWebHookDto.setTitle(bundle.getString("alerter.notify.title"));
            gotifyWebHookDto.setMessage(renderContent(noticeTemplate, alert));
            GotifyWebHookDto.ClientDisplay clientDisplay = new GotifyWebHookDto.ClientDisplay();
            clientDisplay.setContentType("text/markdown");
            GotifyWebHookDto.Extras extras = new GotifyWebHookDto.Extras();
            extras.setClientDisplay(clientDisplay);
            gotifyWebHookDto.setExtras(extras);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<GotifyWebHookDto> httpEntity = new HttpEntity<>(gotifyWebHookDto, headers);
            String webHookUrl = String.format(alerterProperties.getGotifyNotifyUrl(), receiver.getGotifyToken());
            ResponseEntity<CommonRobotNotifyResp> responseEntity = restTemplate.postForEntity(webHookUrl,
                    httpEntity, CommonRobotNotifyResp.class);
            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send Gotify webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send Gotify webHook: {} Failed: {}", webHookUrl, responseEntity.getBody());
                throw new AlertNoticeException("Http StatusCode " + responseEntity.getStatusCode());
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Gotify Notify Error] " + e.getMessage());
        }
    }

    /**
     * 通知类型
     *
     * @return 通知类型
     */
    @Override
    public byte type() {
        return 13;
    }

    @Data
    private static class GotifyWebHookDto {
            private String title;
            private String message;
            private Extras extras;


        @Data
        public static class Extras {
            @JsonProperty("client::display")
            private ClientDisplay clientDisplay;
        }

        @Data
        public static class ClientDisplay {
            private String contentType;
        }


    }
}
