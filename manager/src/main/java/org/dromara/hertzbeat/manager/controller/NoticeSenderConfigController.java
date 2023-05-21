package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.manager.pojo.dto.NoticeSender;
import org.dromara.hertzbeat.manager.service.impl.MailGeneralConfigServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import javax.validation.Valid;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alert sender Configuration API
 * 告警发送端配置API
 *
 *
 *
 */
@RestController
@RequestMapping(value = "/api/config", produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Alert sender Configuration API | 告警发送端配置API")
@Slf4j
public class NoticeSenderConfigController {
    @Autowired
    private MailGeneralConfigServiceImpl mailConfigService;

    @PostMapping(path = "/sender")
    @Operation(summary = "Save the sender config", description = "保存发送端配置")
    public ResponseEntity<Message<String>> saveOrUpdateConfig(
            @RequestBody @Valid NoticeSender noticeSender) {
        mailConfigService.saveConfig(noticeSender, noticeSender.isEmailEnable());
        return ResponseEntity.ok(new Message<>("发送端配置保存成功|The sender configuration is saved successfully"));
    }

    @GetMapping(path = "/senders")
    @Operation(summary = "Get the sender config", description = "获取发送端配置")
    public ResponseEntity<Message<List<NoticeSender>>> getConfig(){
        List<NoticeSender> senders = mailConfigService.getConfigs();
        return ResponseEntity.ok(new Message<>(senders));
    }

    @DeleteMapping(path = "/sender/{id}")
    @Operation(summary = "Delete the sender config", description = "删除发送端配置")
    public ResponseEntity<Message<String>> deleteConfig(){
        mailConfigService.deleteConfig();
        return ResponseEntity.ok(new Message<>("发送端配置删除成功|The sender configuration is deleted"));
    }
}
