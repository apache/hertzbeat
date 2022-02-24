package com.usthe.manager.component.alerter;

import com.usthe.alert.AlerterDataQueue;
import com.usthe.alert.AlerterWorkerPool;
import com.usthe.common.util.CommonUtil;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.alert.service.AlertService;
import com.usthe.manager.pojo.dto.DingTalkWebHookDto;
import com.usthe.manager.pojo.dto.FlyBookWebHookDto;
import com.usthe.manager.pojo.dto.WeWorkWebHookDto;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.manager.service.MailService;
import com.usthe.manager.service.MonitorService;
import com.usthe.manager.service.NoticeConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import javax.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 告警信息入库分发
 * @author tom
 * @date 2021/12/10 12:58
 */
@Component
@Slf4j
public class DispatchAlarm {

    private AlerterWorkerPool workerPool;
    private AlerterDataQueue dataQueue;
    private AlertService alertService;
    private MonitorService monitorService;
    private NoticeConfigService noticeConfigService;
    private JavaMailSender javaMailSender;
    private RestTemplate restTemplate;
    private MailService mailService;

    @Value("${spring.mail.username}")
    private String emailFromUser;

    public DispatchAlarm(AlerterWorkerPool workerPool, AlerterDataQueue dataQueue,
                         JavaMailSender javaMailSender, NoticeConfigService noticeConfigService,
                         AlertService alertService, MonitorService monitorService, RestTemplate restTemplate, MailService mailService) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alertService = alertService;
        this.monitorService = monitorService;
        this.noticeConfigService = noticeConfigService;
        this.javaMailSender = javaMailSender;
        this.restTemplate = restTemplate;
        this.mailService = mailService;
        startDispatch();
    }

    private void startDispatch() {
        Runnable runnable = () -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Alert alert = dataQueue.pollAlertData();
                    if (alert != null) {
                        // 判断告警类型入库
                        storeAlertData(alert);
                        // 通知分发
                        sendAlertDataListener(alert);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        };
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
    }

    private void storeAlertData(Alert alert) {
        // todo 使用缓存不直接操作库
        Monitor monitor = monitorService.getMonitor(alert.getMonitorId());
        if (monitor == null) {
            log.warn("Dispatch alarm the monitorId: {} not existed, ignored.", alert.getMonitorId());
            return;
        }
        alert.setMonitorName(monitor.getName());
        if (monitor.getStatus() == CommonConstants.UN_MANAGE_CODE) {
            // 当监控未管理时  忽略静默其告警信息
            return;
        }
        if (monitor.getStatus() == CommonConstants.AVAILABLE_CODE) {
            if (CommonConstants.AVAILABLE.equals(alert.getTarget())) {
                // 可用性告警 需变更监控状态为不可用
                monitorService.updateMonitorStatus(monitor.getId(), CommonConstants.UN_AVAILABLE_CODE);
            } else if (CommonConstants.REACHABLE.equals(alert.getTarget())) {
                // 可达性告警 需变更监控状态为不可达
                monitorService.updateMonitorStatus(monitor.getId(), CommonConstants.UN_REACHABLE_CODE);
            }
        } else {
            // 若是恢复告警 需对监控状态进行恢复
           if (alert.getStatus() == CommonConstants.ALERT_STATUS_CODE_RESTORED) {
               monitorService.updateMonitorStatus(alert.getMonitorId(), CommonConstants.AVAILABLE_CODE);
           }
        }
        // 告警落库
        alertService.addAlert(alert);
    }

    private void sendAlertDataListener(Alert alert) {
        // todo 转发配置的邮件 微信 webhook
        List<NoticeReceiver> receivers = matchReceiverByNoticeRules(alert);
        // todo 发送通知这里暂时单线程
        for (NoticeReceiver receiver : receivers) {
            switch (receiver.getType()) {
                // todo 短信通知
                case 0: break;
                case 1: sendEmailAlert(receiver, alert); break;
                case 2: sendWebHookAlert(receiver, alert); break;
                case 3: sendWeChatAlert(receiver, alert); break;
                case 4: sendWeWorkRobotAlert(receiver, alert); break;
                case 5: sendDingTalkRobotAlert(receiver, alert); break;
                case 6: sendFlyBookAlert(receiver,alert); break;
                default: break;
            }
        }
    }

    /**
     * 通过飞书发送告警信息
     * @param receiver 接收人
     * @param alert 告警信息
     */
    private void sendFlyBookAlert(NoticeReceiver receiver, Alert alert) {
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

    /**
     * 通过钉钉机器人发送告警信息
     * @param receiver  通知配置信息
     * @param alert     告警信息
     */
    private void sendDingTalkRobotAlert(NoticeReceiver receiver, Alert alert) {
        DingTalkWebHookDto dingTalkWebHookDto = new DingTalkWebHookDto();
        DingTalkWebHookDto.MarkdownDTO markdownDTO = new DingTalkWebHookDto.MarkdownDTO();
        String content = "#### [TanCloud探云告警通知]\n##### **告警目标对象** : " +
                alert.getTarget() + "\n   " +
                "##### **所属监控ID** : " + alert.getMonitorId() + "\n   " +
                "##### **所属监控名称** : " + alert.getMonitorName() + "\n   " +
                "##### **告警级别** : " +
                CommonUtil.transferAlertPriority(alert.getPriority()) + "\n   " +
                "##### **内容详情** : " + alert.getContent();
        markdownDTO.setText(content);
        markdownDTO.setTitle("TanCloud探云告警通知");
        dingTalkWebHookDto.setMarkdown(markdownDTO);
        String webHookUrl = DingTalkWebHookDto.WEBHOOK_URL + receiver.getAccessToken();
        try {
            ResponseEntity<String> entity = restTemplate.postForEntity(webHookUrl, dingTalkWebHookDto, String.class);
            if (entity.getStatusCode() == HttpStatus.OK) {
                log.debug("Send dingTalk webHook: {} Success", webHookUrl);
            } else {
                log.warn("Send dingTalk webHook: {} Failed: {}", webHookUrl, entity.getBody());
            }
        } catch (ResourceAccessException e) {
            log.warn("Send dingTalk: {} Failed: {}.", webHookUrl, e.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 通过企业微信发送告警信息
     * @param receiver  通知配置信息
     * @param alert     告警信息
     */
    private void sendWeWorkRobotAlert(NoticeReceiver receiver, Alert alert) {
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
        }else {
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

    private void sendWeChatAlert(NoticeReceiver receiver, Alert alert) {

    }

    private void sendWebHookAlert(NoticeReceiver receiver, Alert alert) {
        try {
            ResponseEntity<String> entity = restTemplate.postForEntity(receiver.getHookUrl(), alert, String.class);
            if (entity.getStatusCode().value() < HttpStatus.BAD_REQUEST.value()) {
                log.debug("Send WebHook: {} Success", receiver.getHookUrl());
            } else {
                log.warn("Send WebHook: {} Failed", receiver.getHookUrl());
            }
        } catch (ResourceAccessException e) {
            log.warn("Send WebHook: {} Failed: {}.", receiver.getHookUrl(), e.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }


    private void sendEmailAlert(final NoticeReceiver receiver,final Alert alert){
        try{
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper messageHelper = new MimeMessageHelper(mimeMessage,true,"UTF-8");
            messageHelper.setSubject("TanCloud探云-监控告警");
            //设置发件人Email
            messageHelper.setFrom(emailFromUser);
            //设定收件人Email
            messageHelper.setTo(receiver.getEmail());        
            messageHelper.setSentDate(new Date());
            //构建邮件模版
            String process = mailService.buildAlertHtmlTemplate(alert);
            //设置邮件内容模版
            messageHelper.setText(process,true);   
            javaMailSender.send(mimeMessage);
        }catch (Exception e){
            log.error("[邮箱告警] error，Exception information={}",e.getMessage());
        }
    }

    private List<NoticeReceiver> matchReceiverByNoticeRules(Alert alert) {
        // todo 使用缓存
        return noticeConfigService.getReceiverFilterRule(alert);
    }


}
