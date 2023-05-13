package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.manager.pojo.dto.MailConfig;
import org.dromara.hertzbeat.manager.service.impl.MailGeneralConfigServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import javax.validation.Valid;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alert sender Configuration API
 * 告警发送端配置API
 *
 * @author zqr10159
 *
 */
@RestController
@RequestMapping(value = "/api/config", produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Alert sender Configuration API | 告警发送端配置API")
@Slf4j
public class MailConfigController {
    @Autowired
    private MailGeneralConfigServiceImpl mailConfigService;

    @PostMapping(path = "/mail/save")
    @Operation(summary = "Save the mail server config", description = "保存邮件服务器配置")
    public ResponseEntity<Message<String>> saveOrUpdateMailConfig(
            @RequestBody @Valid MailConfig mailConfig
    ) {
        mailConfigService.saveConfig(mailConfig, mailConfig.isEnabled());
        return ResponseEntity.ok(new Message<>("邮件服务器配置保存成功|The mail server configuration is saved successfully"));
    }

    @GetMapping(path = "/mail/get")
    @Operation(summary = "Get the mail server config", description = "获取邮件服务器配置")
    public ResponseEntity<Message<MailConfig>> getMailConfig(){
        MailConfig mailConfig = mailConfigService.getConfig();
        return ResponseEntity.ok(new Message<>(mailConfig));
    }

    @DeleteMapping(path = "/mail/delete")
    @Operation(summary = "Delete the mail server config", description = "删除邮件服务器配置")
    public ResponseEntity<Message<String>> deleteMailConfig(){
        mailConfigService.deleteConfig();
        return ResponseEntity.ok(new Message<>("邮件服务器配置删除成功|The mail server configuration is deleted"));
    }
}