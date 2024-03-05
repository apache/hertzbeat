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

package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.service.NoticeConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.Predicate;
import javax.validation.Valid;
import java.util.List;
import java.util.Optional;

import static org.dromara.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;


/**
 * Message Notification Configuration API
 * 消息通知配置API
 *
 * @author tom
 */
@Tag(name = "Notification Config API | 消息通知配置API")
@RestController()
@RequestMapping(value = "/api/notice", produces = {APPLICATION_JSON_VALUE})
public class NoticeConfigController {

    @Autowired
    private NoticeConfigService noticeConfigService;

    @PostMapping(path = "/receiver")
    @Operation(summary = "Add a recipient", description = "新增一个接收人")
    public ResponseEntity<Message<Void>> addNewNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.addReceiver(noticeReceiver);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping(path = "/receiver")
    @Operation(summary = "Modify existing recipient information", description = "修改已存在的接收人信息")
    public ResponseEntity<Message<Void>> editNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.editReceiver(noticeReceiver);
        return ResponseEntity.ok(Message.success("Edit success"));
    }

    @DeleteMapping(path = "/receiver/{id}")
    @Operation(summary = "Delete existing recipient information", description = "删除已存在的接收人信息")
    public ResponseEntity<Message<Void>> deleteNoticeReceiver(
            @Parameter(description = "en: Recipient ID,zh: 接收人ID", example = "6565463543") @PathVariable("id") final Long receiverId) {
        NoticeReceiver noticeReceiver = noticeConfigService.getReceiverById(receiverId);
        if (noticeReceiver == null) {
            return ResponseEntity.ok(Message.success("The relevant information of the recipient could not be found, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteReceiver(receiverId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/receivers")
    @Operation(summary = "Get a list of message notification recipients based on query filter items",
            description = "根据查询过滤项获取消息通知接收人列表")
    public ResponseEntity<Message<List<NoticeReceiver>>> getReceivers(
            @Parameter(description = "en: Recipient name,zh: 接收人名称，模糊查询", example = "tom") @RequestParam(required = false) final String name) {
        Specification<NoticeReceiver> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !name.isEmpty()) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        List<NoticeReceiver> receivers = noticeConfigService.getNoticeReceivers(specification);
        Message<List<NoticeReceiver>> message = Message.success(receivers);
        return ResponseEntity.ok(message);
    }

    @PostMapping(path = "/rule")
    @Operation(summary = "Add a notification policy", description = "新增一个通知策略")
    public ResponseEntity<Message<Void>> addNewNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.addNoticeRule(noticeRule);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping(path = "/rule")
    @Operation(summary = "Modify existing notification policy information", description = "修改已存在的通知策略信息")
    public ResponseEntity<Message<Void>> editNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.editNoticeRule(noticeRule);
        return ResponseEntity.ok(Message.success("Edit success"));
    }

    @DeleteMapping(path = "/rule/{id}")
    @Operation(summary = "Delete existing notification policy information", description = "删除已存在的通知策略信息")
    public ResponseEntity<Message<Void>> deleteNoticeRule(
            @Parameter(description = "en: Notification Policy ID,zh: 通知策略ID", example = "6565463543") @PathVariable("id") final Long ruleId) {
        // Returns success if it does not exist or if the deletion is successful
        // todo 不存在或删除成功都返回成功
        NoticeRule noticeRule = noticeConfigService.getNoticeRulesById(ruleId);
        if (noticeRule == null) {
            return ResponseEntity.ok(Message.success("The specified notification rule could not be queried, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteNoticeRule(ruleId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/rules")
    @Operation(summary = "Get a list of message notification policies based on query filter items",
            description = "根据查询过滤项获取消息通知策略列表")
    public ResponseEntity<Message<List<NoticeRule>>> getRules(
            @Parameter(description = "en: Recipient name,zh: 接收人名称，模糊查询", example = "rule1") @RequestParam(required = false) final String name) {
        Specification<NoticeRule> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !name.isEmpty()) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        List<NoticeRule> receiverPage = noticeConfigService.getNoticeRules(specification);
        Message<List<NoticeRule>> message = Message.success(receiverPage);
        return ResponseEntity.ok(message);
    }


    @PostMapping(path = "/template")
    @Operation(summary = "Add a notification template", description = "新增一个通知模板")
    public ResponseEntity<Message<Void>> addNewNoticeTemplate(@Valid @RequestBody NoticeTemplate noticeTemplate) {
        noticeConfigService.addNoticeTemplate(noticeTemplate);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping(path = "/template")
    @Operation(summary = "Modify existing notification template information", description = "修改已存在的通知模板信息")
    public ResponseEntity<Message<Void>> editNoticeTemplate(@Valid @RequestBody NoticeTemplate noticeTemplate) {
        noticeConfigService.editNoticeTemplate(noticeTemplate);
        return ResponseEntity.ok(Message.success("Edit success"));
    }

    @DeleteMapping(path = "/template/{id}")
    @Operation(summary = "Delete existing notification template information", description = "删除已存在的通知模板信息")
    public ResponseEntity<Message<Void>> deleteNoticeTemplate(
            @Parameter(description = "en: Notification template ID,zh: 通知模板ID", example = "6565463543") @PathVariable("id") final Long templateId) {
        // Returns success if it does not exist or if the deletion is successful
        // todo 不存在或删除成功都返回成功
        Optional<NoticeTemplate> noticeTemplate = noticeConfigService.getNoticeTemplatesById(templateId);
        if (noticeTemplate.isEmpty()) {
            return ResponseEntity.ok(Message.success("The specified notification template could not be queried, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteNoticeTemplate(templateId);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/templates")
    @Operation(summary = "Get a list of message notification templates based on query filter items",
            description = "根据查询过滤项获取消息通知模板列表")
    public ResponseEntity<Message<List<NoticeTemplate>>> getTemplates(
            @Parameter(description = "Template name | 模板名称，模糊查询", example = "rule1") @RequestParam(required = false) final String name) {

        Specification<NoticeTemplate> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        List<NoticeTemplate> templatePage = noticeConfigService.getNoticeTemplates(specification);
        Message<List<NoticeTemplate>> message = Message.success(templatePage);
        return ResponseEntity.ok(message);
    }

    @PostMapping(path = "/receiver/send-test-msg")
    @Operation(summary = "Send test msg to receiver", description = "给指定接收人发送测试消息")
    public ResponseEntity<Message<Void>> sendTestMsg(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        boolean sendFlag = noticeConfigService.sendTestMsg(noticeReceiver);
        if (sendFlag) {
            return ResponseEntity.ok(Message.success());
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "Notify service not available, please check config!"));
    }
}
