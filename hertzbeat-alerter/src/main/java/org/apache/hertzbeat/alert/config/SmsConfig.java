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

package org.apache.hertzbeat.alert.config;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * SMS configuration
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Component
@ConfigurationProperties(prefix = "alerter.sms")
public class SmsConfig {

    /**
     * whether to enable SMS, default is false
     */
    private boolean enable = false;

    /**
     * sms service provider
     */
    @NotBlank(message = "Type cannot be empty")
    private String type;

    /**
     * Tencent cloud SMS configuration
     */
    private TencentSmsProperties tencent;

    /**
     * Aliyun SMS configuration
     */
    private AlibabaSmsProperties alibaba;

    /**
     * UniSMS configuration
     */
    private UniSmsProperties unisms;

    /**
     * Aws configuration
     */
    private AwsSmsProperties aws;

    /**
     * Twilio SMS configuration
     */
    private TwilioSmsProperties twilio;

    /**
     * Smslocal SMS configuration
     */
    private SmslocalSmsProperties smslocal;
}