/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Message Notification Configuration API
 */
@Tag(name = "Notification Config API")
@RestController()
@RequestMapping(value = "/api/notice", produces = {APPLICATION_JSON_VALUE})
public class NoticeConfigController {

    @Autowired
    private NoticeConfigService noticeConfigService;

    @PostMapping(path = "/receiver")
    @Operation(summary = "Add a recipient", description = "Add a recipient")
    public ResponseEntity<Message<Void>> addNewNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.addReceiver(noticeReceiver);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping(path = "/receiver")
    @Operation(summary = "Modify existing recipient information", description = "Modify existing recipient information")
    public ResponseEntity<Message<Void>> editNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.editReceiver(noticeReceiver);
        return ResponseEntity.ok(Message.success("Edit success"));
    }

    @DeleteMapping(path = "/receiver/{id}")
    @Operation(summary = "Delete existing recipient information", description = "Delete existing recipient information")
    public ResponseEntity<Message<Void>> deleteNoticeReceiver(
            @Parameter(description = "en: Recipient ID", example = "6565463543") @PathVariable("id") final Long receiverId) {
        NoticeReceiver noticeReceiver = noticeConfigService.getReceiverById(receiverId);
        if (noticeReceiver == null) {
            return ResponseEntity.ok(Message.success("The relevant information of the recipient could not be found, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteReceiver(receiverId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/receivers")
    @Operation(summary = "Get a list of message notification recipients based on query filter items",
            description = "Get a list of message notification recipients based on query filter items")
    public ResponseEntity<Message<Page<NoticeReceiver>>> getReceivers(
            @Parameter(description = "en: Recipient name,support fuzzy query", example = "tom") @RequestParam(required = false) final String name,
            @Parameter(description = "en: List current page", example = "0") @RequestParam(defaultValue = "0") final int pageIndex,
            @Parameter(description = "en: Number of list pages", example = "8") @RequestParam(defaultValue = "8") final int pageSize) {
        return ResponseEntity.ok(Message.success(noticeConfigService.getNoticeReceivers(name, pageIndex, pageSize)));
    }

    @GetMapping(path = "/receivers/all")
    @Operation(summary = "Get a list of all message notification recipients",
            description = "Get a list of all message notification recipients")
    public ResponseEntity<Message<List<NoticeReceiver>>> getAllReceivers() {
        return ResponseEntity.ok(Message.success(noticeConfigService.getAllNoticeReceivers()));
    }

    @GetMapping(path = "/receiver/{id}")
    @Operation(summary = "Get the recipient information based on the recipient ID",
            description = "Get the recipient information based on the recipient ID")
    public ResponseEntity<Message<NoticeReceiver>> getReceiverById(
            @Parameter(description = "en: Recipient ID", example = "6565463543") @PathVariable("id") final Long receiverId) {
        NoticeReceiver noticeReceiver = noticeConfigService.getReceiverById(receiverId);
        if (noticeReceiver == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "The relevant information of the recipient could not be found, please check whether the parameters are correct or refresh the page"));
        }
        return ResponseEntity.ok(Message.success(noticeReceiver));
    }

    @PostMapping(path = "/rule")
    @Operation(summary = "Add a notification policy", description = "Add a notification policy")
    public ResponseEntity<Message<Void>> addNewNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.addNoticeRule(noticeRule);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping(path = "/rule")
    @Operation(summary = "Modify existing notification policy information", description = "Modify existing notification policy information")
    public ResponseEntity<Message<Void>> editNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.editNoticeRule(noticeRule);
        return ResponseEntity.ok(Message.success("Edit success"));
    }

    @DeleteMapping(path = "/rule/{id}")
    @Operation(summary = "Delete existing notification policy information", description = "Delete existing notification policy information")
    public ResponseEntity<Message<Void>> deleteNoticeRule(
            @Parameter(description = "en: Notification Policy ID", example = "6565463543") @PathVariable("id") final Long ruleId) {
        // Returns success if it does not exist or if the deletion is successful
        NoticeRule noticeRule = noticeConfigService.getNoticeRulesById(ruleId);
        if (noticeRule == null) {
            return ResponseEntity.ok(Message.success("The specified notification rule could not be queried, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteNoticeRule(ruleId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/rules")
    @Operation(summary = "Get a list of message notification policies based on query filter items",
            description = "Get a list of message notification policies based on query filter items")
    public ResponseEntity<Message<Page<NoticeRule>>> getRules(
            @Parameter(description = "en: Recipient name", example = "rule1") @RequestParam(required = false) final String name,
            @Parameter(description = "en: List current page", example = "0") @RequestParam(defaultValue = "0") final int pageIndex,
            @Parameter(description = "en: Number of list pages", example = "8") @RequestParam(defaultValue = "8") final int pageSize) {
        return ResponseEntity.ok(Message.success(noticeConfigService.getNoticeRules(name, pageIndex, pageSize)));
    }

    @GetMapping(path = "/rule/{id}")
    @Operation(summary = "Get the notification policy information based on the policy ID",
            description = "Get the notification policy information based on the policy ID")
    public ResponseEntity<Message<NoticeRule>> getRuleById(
            @Parameter(description = "en: Notification Policy ID", example = "6565463543") @PathVariable("id") final Long ruleId) {
        NoticeRule noticeRule = noticeConfigService.getNoticeRulesById(ruleId);
        if (noticeRule == null) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "The specified notification rule could not be queried, please check whether the parameters are correct or refresh the page"));
        }
        return ResponseEntity.ok(Message.success(noticeRule));
    }

    @PostMapping(path = "/template")
    @Operation(summary = "Add a notification template", description = "Add a notification template")
    public ResponseEntity<Message<Void>> addNewNoticeTemplate(@Valid @RequestBody NoticeTemplate noticeTemplate) {
        noticeConfigService.addNoticeTemplate(noticeTemplate);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping(path = "/template")
    @Operation(summary = "Modify existing notification template information", description = "Modify existing notification template information")
    public ResponseEntity<Message<Void>> editNoticeTemplate(@Valid @RequestBody NoticeTemplate noticeTemplate) {
        noticeConfigService.editNoticeTemplate(noticeTemplate);
        return ResponseEntity.ok(Message.success("Edit success"));
    }

    @DeleteMapping(path = "/template/{id}")
    @Operation(summary = "Delete existing notification template information", description = "Delete existing notification template information")
    public ResponseEntity<Message<Void>> deleteNoticeTemplate(
            @Parameter(description = "en: Notification template ID", example = "6565463543") @PathVariable("id") final Long templateId) {
        // Returns success if it does not exist or if the deletion is successful
        Optional<NoticeTemplate> noticeTemplate = noticeConfigService.getNoticeTemplatesById(templateId);
        if (noticeTemplate.isEmpty()) {
            return ResponseEntity.ok(Message.success("The specified notification template could not be queried, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteNoticeTemplate(templateId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/templates")
    @Operation(summary = "Get a list of message notification templates based on query filter items",
            description = "Get a list of message notification templates based on query filter items")
    public ResponseEntity<Message<Page<NoticeTemplate>>> getTemplates(
            @Parameter(description = "Template name,support fuzzy query", example = "rule1") @RequestParam(required = false) final String name,
            @Parameter(description = "Whether it is a preset template", example = "true") @RequestParam(defaultValue = "true") final boolean preset,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") final int pageIndex,
            @Parameter(description = "Number of list pages", example = "8") @RequestParam(defaultValue = "8") final int pageSize) {
        Page<NoticeTemplate> templatePage = noticeConfigService.getNoticeTemplates(name, preset, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(templatePage));
    }

    @GetMapping(path = "/templates/all")
    @Operation(summary = "Get a list of all message notification templates",
            description = "Get a list of all message notification templates")
    public ResponseEntity<Message<List<NoticeTemplate>>> getAllTemplates() {
        return ResponseEntity.ok(Message.success(noticeConfigService.getAllNoticeTemplates()));
    }

    @GetMapping(path = "/template/{id}")
    @Operation(summary = "Get the notification template information based on the template ID",
            description = "Get the notification template information based on the template ID")
    public ResponseEntity<Message<NoticeTemplate>> getTemplateById(
            @Parameter(description = "en: Notification template ID", example = "6565463543") @PathVariable("id") final Long templateId) {
        Optional<NoticeTemplate> noticeTemplate = noticeConfigService.getNoticeTemplatesById(templateId);
        if (noticeTemplate.isEmpty()) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "The specified notification template could not be queried, please check whether the parameters are correct or refresh the page"));
        }
        return ResponseEntity.ok(Message.success(noticeTemplate.get()));
    }

    @PostMapping(path = "/receiver/send-test-msg")
    @Operation(summary = "Send test msg to receiver", description = "Send test msg to receiver")
    public ResponseEntity<Message<Void>> sendTestMsg(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        boolean sendFlag = noticeConfigService.sendTestMsg(noticeReceiver);
        if (sendFlag) {
            return ResponseEntity.ok(Message.success());
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "Notify service not available, please check config!"));
    }
}
