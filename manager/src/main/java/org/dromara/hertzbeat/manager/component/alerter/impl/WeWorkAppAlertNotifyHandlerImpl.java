package org.dromara.hertzbeat.manager.component.alerter.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.pojo.dto.WeChatAppDTO;
import org.dromara.hertzbeat.manager.pojo.dto.WeChatAppReq;
import org.dromara.hertzbeat.manager.support.exception.AlertNoticeException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Objects;

/**
 * WeChat app alert notify impl
 *
 * @author hdd
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WeWorkAppAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    /**
     * send weChat app message url
     */
    private static final String APP_MESSAGE_URL = "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s";

    /**
     * get access_token url
     */
    private static final String SECRET_URL = "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s";

    /**
     * 应用消息发送对象
     */
    private static final String DEFAULT_ALL = "@all";

    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) throws AlertNoticeException {
        String corpId = receiver.getCorpId();
        Integer agentId = receiver.getAgentId();
        String appSecret = receiver.getAppSecret();

        try {
            ResponseEntity<WeChatAppReq> entityResponse = restTemplate.getForEntity(String.format(SECRET_URL, corpId, appSecret), WeChatAppReq.class);
            if (Objects.nonNull(entityResponse.getBody())) {
                String accessToken = entityResponse.getBody().getAccessToken();
                WeChatAppDTO.MarkdownDTO markdown = new WeChatAppDTO.MarkdownDTO();
                markdown.setContent(renderContent(noticeTemplate, alert));
                WeChatAppDTO weChatAppDTO = WeChatAppDTO.builder()
                        .toUser(DEFAULT_ALL)
                        .msgType(WeChatAppDTO.MARKDOWN)
                        .markdown(markdown)
                        .agentId(agentId)
                        .build();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<WeChatAppDTO> weChatAppEntity = new HttpEntity<>(weChatAppDTO, headers);
                ResponseEntity<WeChatAppReq> response = restTemplate.postForEntity(String.format(APP_MESSAGE_URL, accessToken), weChatAppEntity, WeChatAppReq.class);
                if (Objects.nonNull(response.getBody()) && !Objects.equals(response.getBody().getErrCode(), 0)) {
                    log.warn("Send Enterprise WeChat App Error: {}", response.getBody().getErrMsg());
                    throw new AlertNoticeException("Http StatusCode " + response.getStatusCode() + " Error: " + response.getBody().getErrMsg());
                }
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[Enterprise WeChat Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 10;
    }
}
