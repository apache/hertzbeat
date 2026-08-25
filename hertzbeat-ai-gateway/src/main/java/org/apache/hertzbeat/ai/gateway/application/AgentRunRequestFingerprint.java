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

package org.apache.hertzbeat.ai.gateway.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.contract.AgentRunRequestSnapshot;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.util.JsonUtil;

/**
 * Stable hash of fields that can change one runtime invocation's behavior.
 */
public final class AgentRunRequestFingerprint {

    public static final String VERSION = "1";

    private AgentRunRequestFingerprint() {
    }

    static String from(InvokeCommand command, AgentApprovalHandling approvalHandling) {
        return from(snapshot(command, approvalHandling));
    }

    public static String from(AgentRunRequestSnapshot request) {
        FingerprintMaterial material = new FingerprintMaterial(
                request.entryType(), request.target(), request.alertIncident(), request.message(),
                List.copyOf(request.attachments()), GatewayText.normalize(request.preferredLanguage()),
                request.approvalHandling(), request.replyMode());
        String canonical = JsonUtil.toJson(material);
        if (!org.springframework.util.StringUtils.hasText(canonical)) {
            throw new IllegalStateException("Agent run request fingerprint material cannot be serialized");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return "sha256:" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for Agent run request identity", exception);
        }
    }

    static AgentRunRequestSnapshot snapshot(InvokeCommand command, AgentApprovalHandling approvalHandling) {
        return AgentRunRequestSnapshot.builder()
                .version(AgentRunRequestSnapshot.VERSION)
                .conversationId(command.userInput().getConversationId())
                .messageId(command.userInput().getMessageId())
                .entryType(command.entryType().name())
                .target(command.userInput().getTarget())
                .alertIncident(command.userInput().getAlertIncident())
                .message(command.userInput().getMessage().getText())
                .attachments(command.userInput().getMessage().getAttachments())
                .preferredLanguage(GatewayText.normalize(command.envelope().getPreferredLanguage()))
                .approvalHandling(approvalHandling.name())
                .replyMode(command.replyMode().name())
                .build();
    }

    private record FingerprintMaterial(
            String entryType,
            Object target,
            Object alertIncident,
            String message,
            List<String> attachments,
            String preferredLanguage,
            String approvalHandling,
            String replyMode) {
    }
}
