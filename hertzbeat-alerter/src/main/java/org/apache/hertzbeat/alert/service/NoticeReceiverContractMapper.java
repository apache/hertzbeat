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

package org.apache.hertzbeat.alert.service;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dto.NoticeReceiverOptions;
import org.apache.hertzbeat.alert.dto.NoticeReceiverRequest;
import org.apache.hertzbeat.alert.dto.NoticeReceiverResponse;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.springframework.stereotype.Component;

/** Maps and validates the public receiver contract against the persistence model. */
@Component
public class NoticeReceiverContractMapper {

    private static final Set<String> SECRET_FIELDS = Set.of(
            "hookUrl", "hookAuthToken", "wechatId", "accessToken", "tgBotToken", "slackWebHookUrl",
            "appSecret", "discordBotToken", "smnAk", "smnSk", "serverChanToken", "gotifyToken");
    private static final Map<Byte, String> TYPE_KEYS = Map.ofEntries(
            Map.entry((byte) 0, "sms"), Map.entry((byte) 1, "email"), Map.entry((byte) 2, "webhook"),
            Map.entry((byte) 3, "wechat-official"), Map.entry((byte) 4, "wecom-robot"),
            Map.entry((byte) 5, "dingtalk-robot"), Map.entry((byte) 6, "feishu-robot"),
            Map.entry((byte) 7, "telegram-bot"), Map.entry((byte) 8, "slack-webhook"),
            Map.entry((byte) 9, "discord-bot"), Map.entry((byte) 10, "wecom-app"),
            Map.entry((byte) 11, "huawei-smn"), Map.entry((byte) 12, "server-chan"),
            Map.entry((byte) 13, "gotify"), Map.entry((byte) 14, "feishu-app"));
    private static final Map<Byte, Set<String>> ALLOWED_FIELDS = Map.ofEntries(
            Map.entry((byte) 0, Set.of("phone")),
            Map.entry((byte) 1, Set.of("email")),
            Map.entry((byte) 2, Set.of("hookUrl", "hookAuthType", "hookAuthToken")),
            Map.entry((byte) 3, Set.of()),
            Map.entry((byte) 4, Set.of("wechatId", "phone", "userId")),
            Map.entry((byte) 5, Set.of("accessToken", "appSecret", "phone", "tgUserId")),
            Map.entry((byte) 6, Set.of("accessToken", "userId")),
            Map.entry((byte) 7, Set.of("tgBotToken", "tgUserId", "tgMessageThreadId")),
            Map.entry((byte) 8, Set.of("slackWebHookUrl")),
            Map.entry((byte) 9, Set.of("discordChannelId", "discordBotToken")),
            Map.entry((byte) 10, Set.of("corpId", "agentId", "appSecret", "userId", "partyId", "tagId")),
            Map.entry((byte) 11, Set.of("smnAk", "smnSk", "smnProjectId", "smnRegion", "smnTopicUrn")),
            Map.entry((byte) 12, Set.of("serverChanToken")),
            Map.entry((byte) 13, Set.of("gotifyToken")),
            Map.entry((byte) 14, Set.of("appId", "appSecret", "larkReceiveType", "userId", "chatId", "partyId")));

    public NoticeReceiver toEntity(NoticeReceiverRequest request, NoticeReceiver existing) {
        Byte type = request.getType();
        Set<String> allowed = ALLOWED_FIELDS.get(type);
        if (allowed == null) {
            throw new IllegalArgumentException("Unsupported receiver type");
        }
        NoticeReceiverOptions options = request.getOptions();
        Set<String> supplied = suppliedFields(options);
        if (!allowed.containsAll(supplied)) {
            supplied.removeAll(allowed);
            throw new IllegalArgumentException("Unsupported options for receiver type: " + supplied);
        }
        if (!allowed.containsAll(options.getClearSecrets()) || !SECRET_FIELDS.containsAll(options.getClearSecrets())) {
            throw new IllegalArgumentException("Unsupported secret-clear option");
        }
        NoticeReceiver target = new NoticeReceiver();
        target.setId(existing == null ? request.getId() : existing.getId());
        target.setName(request.getName().trim());
        target.setType(type);
        if (existing != null) {
            target.setCreator(existing.getCreator());
            target.setGmtCreate(existing.getGmtCreate());
        }
        applyOptions(target, options, existing);
        validateRequired(target);
        return target;
    }

    public NoticeReceiverResponse toResponse(NoticeReceiver receiver) {
        NoticeReceiverOptions options = new NoticeReceiverOptions();
        options.setPhone(receiver.getPhone());
        options.setEmail(receiver.getEmail());
        options.setHookAuthType(receiver.getHookAuthType());
        options.setAppId(receiver.getAppId());
        options.setTgUserId(receiver.getTgUserId());
        options.setTgMessageThreadId(receiver.getTgMessageThreadId());
        options.setLarkReceiveType(receiver.getLarkReceiveType());
        options.setUserId(receiver.getUserId());
        options.setChatId(receiver.getChatId());
        options.setCorpId(receiver.getCorpId());
        options.setAgentId(receiver.getAgentId());
        options.setPartyId(receiver.getPartyId());
        options.setTagId(receiver.getTagId());
        options.setDiscordChannelId(receiver.getDiscordChannelId());
        options.setSmnProjectId(receiver.getSmnProjectId());
        options.setSmnRegion(receiver.getSmnRegion());
        options.setSmnTopicUrn(receiver.getSmnTopicUrn());
        options.setClearSecrets(null);
        Set<String> configuredSecrets = configuredSecrets(receiver);
        return new NoticeReceiverResponse(
                receiver.getId(), receiver.getName(), receiver.getType(), TYPE_KEYS.get(receiver.getType()), options,
                configuredSecrets, receiver.getCreator(), receiver.getModifier(), receiver.getGmtCreate(),
                receiver.getGmtUpdate());
    }

    private void applyOptions(NoticeReceiver target, NoticeReceiverOptions source, NoticeReceiver existing) {
        target.setPhone(source.getPhone());
        target.setEmail(source.getEmail());
        target.setHookAuthType(source.getHookAuthType());
        target.setAppId(source.getAppId());
        target.setTgUserId(source.getTgUserId());
        target.setTgMessageThreadId(source.getTgMessageThreadId());
        target.setLarkReceiveType(source.getLarkReceiveType());
        target.setUserId(source.getUserId());
        target.setChatId(source.getChatId());
        target.setCorpId(source.getCorpId());
        target.setAgentId(source.getAgentId());
        target.setPartyId(source.getPartyId());
        target.setTagId(source.getTagId());
        target.setDiscordChannelId(source.getDiscordChannelId());
        target.setSmnProjectId(source.getSmnProjectId());
        target.setSmnRegion(source.getSmnRegion());
        target.setSmnTopicUrn(source.getSmnTopicUrn());
        target.setHookUrl(secret("hookUrl", source.getHookUrl(), existing == null ? null : existing.getHookUrl(), source));
        target.setHookAuthToken(secret("hookAuthToken", source.getHookAuthToken(), existing == null ? null : existing.getHookAuthToken(), source));
        target.setWechatId(secret("wechatId", source.getWechatId(), existing == null ? null : existing.getWechatId(), source));
        target.setAccessToken(secret("accessToken", source.getAccessToken(), existing == null ? null : existing.getAccessToken(), source));
        target.setTgBotToken(secret("tgBotToken", source.getTgBotToken(), existing == null ? null : existing.getTgBotToken(), source));
        target.setSlackWebHookUrl(secret("slackWebHookUrl", source.getSlackWebHookUrl(), existing == null ? null : existing.getSlackWebHookUrl(), source));
        target.setAppSecret(secret("appSecret", source.getAppSecret(), existing == null ? null : existing.getAppSecret(), source));
        target.setDiscordBotToken(secret("discordBotToken", source.getDiscordBotToken(), existing == null ? null : existing.getDiscordBotToken(), source));
        target.setSmnAk(secret("smnAk", source.getSmnAk(), existing == null ? null : existing.getSmnAk(), source));
        target.setSmnSk(secret("smnSk", source.getSmnSk(), existing == null ? null : existing.getSmnSk(), source));
        target.setServerChanToken(secret("serverChanToken", source.getServerChanToken(), existing == null ? null : existing.getServerChanToken(), source));
        target.setGotifyToken(secret("gotifyToken", source.getGotifyToken(), existing == null ? null : existing.getGotifyToken(), source));
    }

    private String secret(String field, String supplied, String existing, NoticeReceiverOptions options) {
        if (options.getClearSecrets().contains(field)) {
            if (StringUtils.isNotBlank(supplied)) {
                throw new IllegalArgumentException("A secret cannot be supplied and cleared together");
            }
            return null;
        }
        return StringUtils.isNotBlank(supplied) ? supplied : existing;
    }

    private void validateRequired(NoticeReceiver receiver) {
        switch (receiver.getType()) {
            case 0 -> require(receiver.getPhone(), "phone");
            case 1 -> require(receiver.getEmail(), "email");
            case 2 -> {
                require(receiver.getHookUrl(), "hookUrl");
                String authType = StringUtils.defaultIfBlank(receiver.getHookAuthType(), "None");
                if (!Set.of("None", "Basic", "Bearer").contains(authType)) {
                    throw new IllegalArgumentException("Unsupported webhook auth type");
                }
                receiver.setHookAuthType(authType);
                if (!"None".equals(authType)) {
                    require(receiver.getHookAuthToken(), "hookAuthToken");
                }
            }
            case 3 -> { }
            case 4 -> require(receiver.getWechatId(), "wechatId");
            case 5, 6 -> require(receiver.getAccessToken(), "accessToken");
            case 7 -> {
                require(receiver.getTgBotToken(), "tgBotToken");
                require(receiver.getTgUserId(), "tgUserId");
            }
            case 8 -> require(receiver.getSlackWebHookUrl(), "slackWebHookUrl");
            case 9 -> {
                require(receiver.getDiscordChannelId(), "discordChannelId");
                require(receiver.getDiscordBotToken(), "discordBotToken");
            }
            case 10 -> {
                require(receiver.getCorpId(), "corpId");
                require(receiver.getAgentId(), "agentId");
                require(receiver.getAppSecret(), "appSecret");
                requireAny("recipient target", receiver.getUserId(), receiver.getPartyId(), receiver.getTagId());
            }
            case 11 -> {
                require(receiver.getSmnAk(), "smnAk");
                require(receiver.getSmnSk(), "smnSk");
                require(receiver.getSmnProjectId(), "smnProjectId");
                require(receiver.getSmnRegion(), "smnRegion");
                require(receiver.getSmnTopicUrn(), "smnTopicUrn");
            }
            case 12 -> require(receiver.getServerChanToken(), "serverChanToken");
            case 13 -> require(receiver.getGotifyToken(), "gotifyToken");
            case 14 -> {
                require(receiver.getAppId(), "appId");
                require(receiver.getAppSecret(), "appSecret");
                require(receiver.getLarkReceiveType(), "larkReceiveType");
                switch (receiver.getLarkReceiveType()) {
                    case 0 -> require(receiver.getUserId(), "userId");
                    case 1 -> require(receiver.getChatId(), "chatId");
                    case 2 -> require(receiver.getPartyId(), "partyId");
                    case 3 -> { }
                    default -> throw new IllegalArgumentException("Unsupported FeiShu receive type");
                }
            }
            default -> throw new IllegalArgumentException("Unsupported receiver type");
        }
    }

    private Set<String> suppliedFields(NoticeReceiverOptions options) {
        Set<String> fields = new LinkedHashSet<>();
        add(fields, "phone", options.getPhone());
        add(fields, "email", options.getEmail());
        add(fields, "hookUrl", options.getHookUrl());
        add(fields, "hookAuthType", options.getHookAuthType());
        add(fields, "hookAuthToken", options.getHookAuthToken());
        add(fields, "wechatId", options.getWechatId());
        add(fields, "appId", options.getAppId());
        add(fields, "accessToken", options.getAccessToken());
        add(fields, "tgBotToken", options.getTgBotToken());
        add(fields, "tgUserId", options.getTgUserId());
        add(fields, "tgMessageThreadId", options.getTgMessageThreadId());
        add(fields, "larkReceiveType", options.getLarkReceiveType());
        add(fields, "userId", options.getUserId());
        add(fields, "chatId", options.getChatId());
        add(fields, "slackWebHookUrl", options.getSlackWebHookUrl());
        add(fields, "corpId", options.getCorpId());
        add(fields, "agentId", options.getAgentId());
        add(fields, "appSecret", options.getAppSecret());
        add(fields, "partyId", options.getPartyId());
        add(fields, "tagId", options.getTagId());
        add(fields, "discordChannelId", options.getDiscordChannelId());
        add(fields, "discordBotToken", options.getDiscordBotToken());
        add(fields, "smnAk", options.getSmnAk());
        add(fields, "smnSk", options.getSmnSk());
        add(fields, "smnProjectId", options.getSmnProjectId());
        add(fields, "smnRegion", options.getSmnRegion());
        add(fields, "smnTopicUrn", options.getSmnTopicUrn());
        add(fields, "serverChanToken", options.getServerChanToken());
        add(fields, "gotifyToken", options.getGotifyToken());
        return fields;
    }

    private Set<String> configuredSecrets(NoticeReceiver receiver) {
        Set<String> fields = new LinkedHashSet<>();
        add(fields, "hookUrl", receiver.getHookUrl());
        add(fields, "hookAuthToken", receiver.getHookAuthToken());
        add(fields, "wechatId", receiver.getWechatId());
        add(fields, "accessToken", receiver.getAccessToken());
        add(fields, "tgBotToken", receiver.getTgBotToken());
        add(fields, "slackWebHookUrl", receiver.getSlackWebHookUrl());
        add(fields, "appSecret", receiver.getAppSecret());
        add(fields, "discordBotToken", receiver.getDiscordBotToken());
        add(fields, "smnAk", receiver.getSmnAk());
        add(fields, "smnSk", receiver.getSmnSk());
        add(fields, "serverChanToken", receiver.getServerChanToken());
        add(fields, "gotifyToken", receiver.getGotifyToken());
        return fields;
    }

    private void add(Set<String> fields, String name, Object value) {
        if (value != null && (!(value instanceof String text) || StringUtils.isNotBlank(text))) {
            fields.add(name);
        }
    }

    private void require(Object value, String name) {
        if (value == null || value instanceof String text && StringUtils.isBlank(text)) {
            throw new IllegalArgumentException("Missing receiver option: " + name);
        }
    }

    private void requireAny(String name, String... values) {
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return;
            }
        }
        throw new IllegalArgumentException("Missing receiver option: " + name);
    }
}
