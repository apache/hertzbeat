package com.usthe.manager.component.alerter.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonUtil;
import com.usthe.manager.component.alerter.AlertNotifyHandler;
import com.usthe.manager.pojo.dto.FlyBookWebHookDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Send alert information through FeiShu
 * 通过飞书发送告警信息
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @since 2022/4/24
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class FlyBookAlertNotifyHandlerImpl implements AlertNotifyHandler {
    private final RestTemplate restTemplate;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        FlyBookWebHookDto flyBookWebHookDto = new FlyBookWebHookDto();
        FlyBookWebHookDto.Content content = new FlyBookWebHookDto.Content();
        FlyBookWebHookDto.Post post = new FlyBookWebHookDto.Post();
        FlyBookWebHookDto.zh_cn zhCn = new FlyBookWebHookDto.zh_cn();
        content.setPost(post);
        post.setZh_cn(zhCn);
        flyBookWebHookDto.setMsg_type("post");
        List<List<FlyBookWebHookDto.FlyBookContent>> contents = new ArrayList<>();
        List<FlyBookWebHookDto.FlyBookContent> contents1 = new ArrayList<>();
        FlyBookWebHookDto.FlyBookContent flyBookContent = new FlyBookWebHookDto.FlyBookContent();
        flyBookContent.setTag("text");
        String text = "告警目标对象 :" + alert.getTarget() +
                "\n所属监控ID :" + alert.getMonitorId() +
                "\n所属监控名称 :" + alert.getMonitorName() +
                "\n告警级别 :" + CommonUtil.transferAlertPriority(alert.getPriority()) +
                "\n内容详情 : " + alert.getContent();
        flyBookContent.setText(text);
        contents1.add(flyBookContent);
        FlyBookWebHookDto.FlyBookContent bookContent = new FlyBookWebHookDto.FlyBookContent();
        bookContent.setTag("a");
        bookContent.setText("登入控制台");
        bookContent.setHref("https://www.tancloud.cn");
        contents1.add(bookContent);
        contents.add(contents1);
        zhCn.setTitle("[TanCloud探云告警通知]");
        zhCn.setContent(contents);
        flyBookWebHookDto.setContent(content);
        String webHookUrl = FlyBookWebHookDto.WEBHOOK_URL + receiver.getWechatId();
        try {
            ResponseEntity<String> entity = restTemplate.postForEntity(webHookUrl, flyBookWebHookDto, String.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send feiShu webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send feiShu webHook: {} Failed: {}", webHookUrl, entity.getBody());
            }
        } catch (ResourceAccessException e) {
            log.warn("Send WebHook: {} Failed: {}.", webHookUrl, e.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    @Override
    public byte type() {
        return 6;
    }
}
