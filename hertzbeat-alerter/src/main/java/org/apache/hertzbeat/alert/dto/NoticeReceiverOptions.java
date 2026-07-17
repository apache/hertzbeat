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

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Data;

/** Type-specific receiver configuration. Credential values are write-only. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NoticeReceiverOptions {

    private String phone;
    private String email;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String hookUrl;
    private String hookAuthType;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String hookAuthToken;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String wechatId;
    private String appId;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String accessToken;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String tgBotToken;
    private String tgUserId;
    private String tgMessageThreadId;
    private Byte larkReceiveType;
    private String userId;
    private String chatId;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String slackWebHookUrl;
    private String corpId;
    private Integer agentId;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String appSecret;
    private String partyId;
    private String tagId;
    private String discordChannelId;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String discordBotToken;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String smnAk;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String smnSk;
    private String smnProjectId;
    private String smnRegion;
    private String smnTopicUrn;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String serverChanToken;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String gotifyToken;
    private Set<String> clearSecrets = new LinkedHashSet<>();
}
