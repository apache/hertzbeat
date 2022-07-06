package com.usthe.manager.component.alerter.impl;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.util.CommonConstants;
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

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
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

    private final AlerterProperties alerterProperties;

    @Override
    public void send(NoticeReceiver receiver, Alert alert) {
        String monitorId = null;
        String monitorName = null;
        if (alert.getTags() != null) {
            monitorId = alert.getTags().get(CommonConstants.TAG_MONITOR_ID);
            monitorName = alert.getTags().get(CommonConstants.TAG_MONITOR_NAME);
        }
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
        StringBuilder textBuilder = new StringBuilder("告警目标对象 :");
        textBuilder.append(alert.getTarget());
        if (monitorId != null) {
            textBuilder.append("\n所属监控ID :").append(monitorId);
        }
        if (monitorName != null) {
            textBuilder.append("\n所属监控名称 :").append(monitorName);
        }
        textBuilder.append("\n告警级别 :")
            .append(CommonUtil.transferAlertPriority(alert.getPriority()));
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        String triggerTime = simpleDateFormat.format(new Date(alert.getLastTriggerTime()));
        textBuilder.append("\n告警触发时间 : ").append(triggerTime);
        textBuilder.append("\n内容详情 : ").append(alert.getContent());
        flyBookContent.setText(textBuilder.toString());
        contents1.add(flyBookContent);
        FlyBookWebHookDto.FlyBookContent bookContent = new FlyBookWebHookDto.FlyBookContent();
        bookContent.setTag("a");
        bookContent.setText("登入控制台");
        bookContent.setHref(alerterProperties.getConsoleUrl());
        contents1.add(bookContent);
        contents.add(contents1);
        zhCn.setTitle("[HertzBeat告警通知]");
        zhCn.setContent(contents);
        flyBookWebHookDto.setContent(content);
        String webHookUrl = alerterProperties.getFlyBookWebHookUrl() + receiver.getWechatId();
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
