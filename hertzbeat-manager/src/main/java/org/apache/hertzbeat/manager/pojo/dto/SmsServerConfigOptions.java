/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/** Typed union of provider options. The selected provider controls the allowed subset. */
@Data
public class SmsServerConfigOptions {

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String secretId;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String secretKey;
    private String appId;
    private String signName;
    private String templateId;
    private String accessKeyId;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String accessKeySecret;
    private String templateCode;
    private String signature;
    private String authMode;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String apiKey;
    private String region;
    private String accountSid;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String authToken;
    private String twilioPhoneNumber;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported SMS server option: " + name);
    }
}
