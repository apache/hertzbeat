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

package org.apache.hertzbeat.ai.gateway.tool.notice;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.dto.NoticeReceiverMutationResponse;
import org.apache.hertzbeat.alert.dto.NoticeReceiverRequest;
import org.apache.hertzbeat.alert.dto.NoticeReceiverResponse;
import org.apache.hertzbeat.alert.notice.NoticeTemplateRenderer;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.alert.service.NoticeReceiverContractService;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.ResourceBundleUtil;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Typed notification configuration; never dispatches notifications or accepts receiver secrets. */
@Service
public class AgentNoticeToolService {
    private final NoticeConfigService notices;
    private final NoticeReceiverContractService receivers;
    private final Validator validator;
    private final AlerterProperties properties;

    public AgentNoticeToolService(NoticeConfigService notices, NoticeReceiverContractService receivers,
                                  Validator validator, AlerterProperties properties) {
        this.notices = notices;
        this.receivers = receivers;
        this.validator = validator;
        this.properties = properties;
    }

    @Tool(
            name = "notice.receiver_list",
            description = "List receivers through the credential-redacted receiver contract.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Page<NoticeReceiverResponse> receiverList(
            @ToolParam(required = false, description = "Name filter.") String name,
            @ToolParam(description = "Zero-based page.") int page,
            @ToolParam(description = "Page size, 1 to 100.") int size) {
        paging(page, size);
        return receivers.page(name, page, size);
    }

    @Tool(
            name = "notice.receiver_get",
            description =
                    "Read a receiver with configured-secret markers and no credential values.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeReceiverResponse receiverGet(@ToolParam(description = "Receiver id.") Long id) {
        positive(id);
        NoticeReceiverResponse receiver = receivers.get(id);
        if (receiver == null || !id.equals(receiver.id())) {
            throw new IllegalArgumentException("Receiver not found");
        }
        return receiver;
    }

    @Tool(
            name = "notice.receiver_update_metadata",
            description =
                    "Update a receiver name and selected non-secret destination fields, preserving"
                        + " all credential values server-side.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeReceiverMutationResponse receiverUpdateMetadata(
            @ToolParam(description = "Receiver id.") Long id,
            @ToolParam(required = false, description = "New display name; omit to preserve.")
                    String name,
            @ToolParam(
                            description =
                                    "Non-secret fields: phone, email, tgUserId, tgMessageThreadId,"
                                        + " userId, chatId, partyId, tagId, discordChannelId,"
                                        + " hookAuthType, appId, corpId, agentId, larkReceiveType,"
                                        + " smnProjectId, smnRegion, smnTopicUrn, ntfyTopic,"
                                        + " wpushChannel, wpushTopicCode. Empty map preserves"
                                        + " destinations.")
                    Map<String, String> fields) {
        if (fields == null || fields.size() > 21 || fields.values().stream().anyMatch(value -> value == null || value.length() > 255)) {
            throw new IllegalArgumentException(
                    "Bounded non-secret destination fields are required");
        }
        NoticeReceiverResponse current = receiverGet(id);
        var options = current.options();
        options.setClearSecrets(java.util.Set.of());
        for (var entry : fields.entrySet()) {
            switch (entry.getKey()) {
                case "phone" -> options.setPhone(entry.getValue());
                case "email" -> options.setEmail(entry.getValue());
                case "tgUserId" -> options.setTgUserId(entry.getValue());
                case "tgMessageThreadId" -> options.setTgMessageThreadId(entry.getValue());
                case "userId" -> options.setUserId(entry.getValue());
                case "chatId" -> options.setChatId(entry.getValue());
                case "partyId" -> options.setPartyId(entry.getValue());
                case "tagId" -> options.setTagId(entry.getValue());
                case "discordChannelId" -> options.setDiscordChannelId(entry.getValue());
                case "hookAuthType" -> options.setHookAuthType(entry.getValue());
                case "appId" -> options.setAppId(entry.getValue());
                case "corpId" -> options.setCorpId(entry.getValue());
                case "agentId" -> options.setAgentId(Integer.valueOf(entry.getValue()));
                case "larkReceiveType" ->
                        options.setLarkReceiveType(Byte.valueOf(entry.getValue()));
                case "smnProjectId" -> options.setSmnProjectId(entry.getValue());
                case "smnRegion" -> options.setSmnRegion(entry.getValue());
                case "smnTopicUrn" -> options.setSmnTopicUrn(entry.getValue());
                case "ntfyTopic" -> options.setNtfyTopic(entry.getValue());
                case "wpushChannel" -> options.setWpushChannel(entry.getValue());
                case "wpushTopicCode" -> options.setWpushTopicCode(entry.getValue());
                default ->
                        throw new IllegalArgumentException(
                                "Unsupported receiver field; use the native receiver editor");
            }
        }
        NoticeReceiverRequest request = new NoticeReceiverRequest();
        request.setId(id);
        request.setName(name == null ? current.name() : name);
        request.setType(current.type());
        request.setOptions(options);
        validate(request);
        var result = receivers.update(request);
        if (result == null
                || !id.equals(result.id())
                || !"updated".equals(result.status())
                || result.receiver() == null
                || !id.equals(result.receiver().id())
                || !java.util.Objects.equals(
                        current.configuredSecrets(), result.receiver().configuredSecrets()))
            throw new IllegalStateException("RECEIVER_METADATA_OUTCOME_UNVERIFIED_DO_NOT_RETRY");
        return result;
    }

    @Tool(
            name = "notice.receiver_create",
            description =
                    "Create a credential-free SMS or email receiver. Other receiver types require"
                        + " the native secure form. Does not send a notification.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeReceiverMutationResponse receiverCreate(
            @ToolParam(description = "Receiver name.") String name,
            @ToolParam(description = "Receiver type: 0 SMS or 1 email.") byte type,
            @ToolParam(description = "Phone number for SMS, email address for email.")
                    String destination) {
        if ((type != 0 && type != 1) || destination == null || destination.isBlank() || destination.length() > 255) {
            throw new IllegalArgumentException("A bounded SMS or email destination is required");
        }
        NoticeReceiverRequest request = new NoticeReceiverRequest();
        request.setName(name);
        request.setType(type);
        if (type == 0) {
            request.getOptions().setPhone(destination);
        } else {
            request.getOptions().setEmail(destination);
        }
        validate(request);
        return receivers.create(request);
    }

    @Tool(
            name = "notice.receiver_delete",
            description = "Delete a receiver through the native verified persistence contract.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeReceiverMutationResponse receiverDelete(
            @ToolParam(description = "Receiver id.") Long id) {
        positive(id);
        return receivers.delete(id);
    }

    @Tool(name = "notice.rule_get", description = "Read a notification rule.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeRule ruleGet(@ToolParam(description = "Rule id.") Long id) {
        positive(id);
        NoticeRule value = notices.getNoticeRulesById(id);
        if (value == null || !id.equals(value.getId())) {
            throw new IllegalArgumentException("Notification rule not found");
        }
        return value;
    }

    @Tool(
            name = "notice.rule_list",
            description = "List notification rules with bounded pagination.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Page<NoticeRule> ruleList(
            @ToolParam(required = false, description = "Name filter.") String name,
            @ToolParam(description = "Zero-based page.") int page,
            @ToolParam(description = "Page size, 1 to 100.") int size) {
        paging(page, size);
        return notices.getNoticeRules(name, page, size);
    }

    @Tool(
            name = "notice.rule_create",
            description = "Create a notification rule; does not send a test notification.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeRule ruleCreate(
            @ToolParam(description = "Rule configuration; omit server-owned id and audit fields.")
                    NoticeRule value) {
        validate(value);
        if (value.getId() != null || value.getCreator() != null || value.getModifier() != null
                || value.getGmtCreate() != null || value.getGmtUpdate() != null) {
            throw new IllegalArgumentException("Server-owned fields must be omitted");
        }
        notices.addNoticeRule(value);
        return ruleGet(value.getId());
    }

    @Tool(
            name = "notice.rule_update",
            description = "Replace an existing notification rule after native validation.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeRule ruleUpdate(
            @ToolParam(
                            description =
                                    "Complete replacement including existing id; omit audit"
                                        + " fields.")
                    NoticeRule value) {
        validate(value);
        if (value.getCreator() != null || value.getModifier() != null || value.getGmtCreate() != null || value.getGmtUpdate() != null) {
            throw new IllegalArgumentException("Audit fields must be omitted");
        }
        NoticeRule existing = ruleGet(value.getId());
        value.setCreator(existing.getCreator());
        value.setGmtCreate(existing.getGmtCreate());
        notices.editNoticeRule(value);
        return ruleGet(value.getId());
    }

    @Tool(
            name = "notice.rule_delete",
            description = "Delete a notification rule and verify absence.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> ruleDelete(@ToolParam(description = "Rule id.") Long id) {
        ruleGet(id);
        notices.deleteNoticeRule(id);
        return Map.of("id", id, "deleted", notices.getNoticeRulesById(id) == null);
    }

    @Tool(name = "notice.template_get", description = "Read a notification template.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeTemplate templateGet(@ToolParam(description = "Template id.") Long id) {
        positive(id);
        NoticeTemplate value = notices.getNoticeTemplatesById(id).orElse(null);
        if (value == null || !id.equals(value.getId())) {
            throw new IllegalArgumentException("Notification template not found");
        }
        return value;
    }

    @Tool(
            name = "notice.template_list",
            description = "List notification templates with bounded pagination.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Page<NoticeTemplate> templateList(
            @ToolParam(required = false, description = "Name filter.") String name,
            @ToolParam(description = "System preset templates.") boolean preset,
            @ToolParam(description = "Zero-based page.") int page,
            @ToolParam(description = "Page size, 1 to 100.") int size) {
        paging(page, size);
        return notices.getNoticeTemplates(name, preset, page, size);
    }

    @Tool(
            name = "notice.template_create",
            description = "Create a notification template; does not send a test notification.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeTemplate templateCreate(
            @ToolParam(
                            description =
                                    "Template configuration; omit server-owned id and audit"
                                        + " fields.")
                    NoticeTemplate value) {
        validate(value);
        if (value.getId() != null || value.getCreator() != null || value.getModifier() != null
                || value.getGmtCreate() != null || value.getGmtUpdate() != null) {
            throw new IllegalArgumentException("Server-owned fields must be omitted");
        }
        notices.addNoticeTemplate(value);
        return templateGet(value.getId());
    }

    @Tool(
            name = "notice.template_update",
            description = "Replace an existing notification template after native validation.")
    @AgentToolPolicy(
            access = AgentToolAccess.USER,
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public NoticeTemplate templateUpdate(
            @ToolParam(
                            description =
                                    "Complete replacement including existing id; omit audit"
                                        + " fields.")
                    NoticeTemplate value) {
        validate(value);
        if (value.getCreator() != null || value.getModifier() != null || value.getGmtCreate() != null || value.getGmtUpdate() != null) {
            throw new IllegalArgumentException("Audit fields must be omitted");
        }
        templateGet(value.getId());
        notices.editNoticeTemplate(value);
        return templateGet(value.getId());
    }

    @Tool(
            name = "notice.template_delete",
            description = "Delete a notification template and verify absence.")
    @AgentToolPolicy(
            access = AgentToolAccess.ADMIN,
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> templateDelete(@ToolParam(description = "Template id.") Long id) {
        templateGet(id);
        notices.deleteNoticeTemplate(id);
        return Map.of("id", id, "deleted", notices.getNoticeTemplatesById(id).orElse(null) == null);
    }

    @Tool(
            name = "notice.template_preview",
            description =
                    "Render a notification template against the native sample alert without sending"
                        + " anything.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public String templatePreview(
            @ToolParam(description = "Template to preview.") NoticeTemplate template) {
        validate(template);
        try {
            return NoticeTemplateRenderer.renderContent(template, NoticeTemplateRenderer.sampleGroupAlert(),
                    properties.getConsoleUrl(), ResourceBundleUtil.getBundle("alerter"));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Notification template could not be rendered");
        }
    }

    private void validate(Object value) {
        if (value == null || !validator.validate(value).isEmpty()) {
            throw new IllegalArgumentException("Invalid notification configuration");
        }
    }

    private static void positive(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("A positive id is required");
        }
    }

    private static void paging(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException(
                    "Page must be nonnegative and size between 1 and 100");
        }
    }
}
