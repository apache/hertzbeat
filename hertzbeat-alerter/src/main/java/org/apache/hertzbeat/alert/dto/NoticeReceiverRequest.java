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

package org.apache.hertzbeat.alert.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Data;

/** Receiver create/update input with structured options and legacy flat-field compatibility. */
@Data
public class NoticeReceiverRequest {

    private Long id;
    @NotBlank
    @Size(max = 100)
    private String name;
    @NotNull
    private Byte type;
    @Valid
    @NotNull
    private NoticeReceiverOptions options = new NoticeReceiverOptions();

    @JsonAnySetter
    public void acceptLegacyOption(String name, Object value) {
        switch (name) {
            case "phone" -> options.setPhone(asString(value));
            case "email" -> options.setEmail(asString(value));
            case "hookUrl" -> options.setHookUrl(asString(value));
            case "hookAuthType" -> options.setHookAuthType(asString(value));
            case "hookAuthToken" -> options.setHookAuthToken(asString(value));
            case "wechatId" -> options.setWechatId(asString(value));
            case "appId" -> options.setAppId(asString(value));
            case "accessToken" -> options.setAccessToken(asString(value));
            case "tgBotToken" -> options.setTgBotToken(asString(value));
            case "tgUserId" -> options.setTgUserId(asString(value));
            case "tgMessageThreadId" -> options.setTgMessageThreadId(asString(value));
            case "larkReceiveType" -> options.setLarkReceiveType(asByte(value));
            case "userId" -> options.setUserId(asString(value));
            case "chatId" -> options.setChatId(asString(value));
            case "slackWebHookUrl" -> options.setSlackWebHookUrl(asString(value));
            case "corpId" -> options.setCorpId(asString(value));
            case "agentId" -> options.setAgentId(asInteger(value));
            case "appSecret" -> options.setAppSecret(asString(value));
            case "partyId" -> options.setPartyId(asString(value));
            case "tagId" -> options.setTagId(asString(value));
            case "discordChannelId" -> options.setDiscordChannelId(asString(value));
            case "discordBotToken" -> options.setDiscordBotToken(asString(value));
            case "smnAk" -> options.setSmnAk(asString(value));
            case "smnSk" -> options.setSmnSk(asString(value));
            case "smnProjectId" -> options.setSmnProjectId(asString(value));
            case "smnRegion" -> options.setSmnRegion(asString(value));
            case "smnTopicUrn" -> options.setSmnTopicUrn(asString(value));
            case "serverChanToken" -> options.setServerChanToken(asString(value));
            case "gotifyToken" -> options.setGotifyToken(asString(value));
            case "clearSecrets" -> options.setClearSecrets(asStringSet(value));
            case "creator", "modifier", "gmtCreate", "gmtUpdate" -> { }
            default -> throw new IllegalArgumentException("Unsupported receiver field: " + name);
        }
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static Byte asByte(Object value) {
        return value == null ? null : Byte.valueOf(value.toString());
    }

    private static Integer asInteger(Object value) {
        return value == null ? null : Integer.valueOf(value.toString());
    }

    private static Set<String> asStringSet(Object value) {
        if (!(value instanceof Collection<?> values)) {
            throw new IllegalArgumentException("clearSecrets must be an array");
        }
        Set<String> result = new LinkedHashSet<>();
        values.forEach(item -> result.add(item.toString()));
        return result;
    }
}
