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

package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.entity.manager.NoticeRule;
import com.usthe.manager.service.NoticeConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
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
import javax.persistence.criteria.Predicate;
import javax.validation.Valid;
import java.util.List;
import static com.usthe.common.util.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Message Notification Configuration API
 * 消息通知配置API
 * @author tom
 * @date 2021/12/16 16:18
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
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping(path = "/receiver")
    @Operation(summary = "Modify existing recipient information", description = "修改已存在的接收人信息")
    public ResponseEntity<Message<Void>> editNoticeReceiver(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        noticeConfigService.editReceiver(noticeReceiver);
        return ResponseEntity.ok(new Message<>("Edit success"));
    }

    @DeleteMapping(path = "/receiver/{id}")
    @Operation(summary = "Delete existing recipient information", description = "删除已存在的接收人信息")
    public ResponseEntity<Message<Void>> deleteNoticeReceiver(
            @Parameter(description = "en: Recipient ID,zh: 接收人ID", example = "6565463543") @PathVariable("id") final Long receiverId) {
        NoticeReceiver noticeReceiver = noticeConfigService.getReceiverById(receiverId);
        if (noticeReceiver == null) {
            return ResponseEntity.ok(new Message<>("The relevant information of the recipient could not be found, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteReceiver(receiverId);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @GetMapping(path = "/receivers")
    @Operation(summary = "Get a list of message notification recipients based on query filter items",
            description = "根据查询过滤项获取消息通知接收人列表")
    public ResponseEntity<Message<List<NoticeReceiver>>> getReceivers(
            @Parameter(description = "en: Recipient name,zh: 接收人名称，模糊查询", example = "tom") @RequestParam(required = false) final String name) {
        Specification<NoticeReceiver> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        List<NoticeReceiver> receivers = noticeConfigService.getNoticeReceivers(specification);
        Message<List<NoticeReceiver>> message = new Message<>(receivers);
        return ResponseEntity.ok(message);
    }

    @PostMapping(path = "/rule")
    @Operation(summary = "Add a notification policy", description = "新增一个通知策略")
    public ResponseEntity<Message<Void>> addNewNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.addNoticeRule(noticeRule);
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping(path = "/rule")
    @Operation(summary = "Modify existing notification policy information", description = "修改已存在的通知策略信息")
    public ResponseEntity<Message<Void>> editNoticeRule(@Valid @RequestBody NoticeRule noticeRule) {
        noticeConfigService.editNoticeRule(noticeRule);
        return ResponseEntity.ok(new Message<>("Edit success"));
    }

    @DeleteMapping(path = "/rule/{id}")
    @Operation(summary = "Delete existing notification policy information", description = "删除已存在的通知策略信息")
    public ResponseEntity<Message<Void>> deleteNoticeRule(
            @Parameter(description = "en: Notification Policy ID,zh: 通知策略ID", example = "6565463543") @PathVariable("id") final Long ruleId) {
        // Returns success if it does not exist or if the deletion is successful
        // todo 不存在或删除成功都返回成功
        NoticeRule noticeRule = noticeConfigService.getNoticeRulesById(ruleId);
        if (noticeRule == null) {
            return ResponseEntity.ok(new Message<>("The specified notification rule could not be queried, please check whether the parameters are correct"));
        }
        noticeConfigService.deleteNoticeRule(ruleId);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @GetMapping(path = "/rules")
    @Operation(summary = "Get a list of message notification policies based on query filter items",
            description = "根据查询过滤项获取消息通知策略列表")
    public ResponseEntity<Message<List<NoticeRule>>> getRules(
            @Parameter(description = "en: Recipient name,zh: 接收人名称，模糊查询", example = "rule1") @RequestParam(required = false) final String name) {
        Specification<NoticeRule> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        List<NoticeRule> receiverPage = noticeConfigService.getNoticeRules(specification);
        Message<List<NoticeRule>> message = new Message<>(receiverPage);
        return ResponseEntity.ok(message);
    }

    @PostMapping(path = "/receiver/send-test-msg")
    @Operation(summary = "Send test msg to receiver", description = "给指定接收人发送测试消息")
    public ResponseEntity<Message<Void>> sendTestMsg(@Valid @RequestBody NoticeReceiver noticeReceiver) {
        boolean sendFlag = noticeConfigService.sendTestMsg(noticeReceiver);
        if (sendFlag) {
            return ResponseEntity.ok(new Message<>());
        }
        Message<Void> message = Message.<Void>builder()
                .msg("Notify service not available, please check config!")
                .code(FAIL_CODE)
                .build();
        return ResponseEntity.ok(message);
    }
}
