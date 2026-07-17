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

package org.apache.hertzbeat.manager.service;

import java.util.LinkedHashSet;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.MailServerConfig;
import org.apache.hertzbeat.common.entity.dto.sms.AlibabaSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.AwsSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.SmsConfig;
import org.apache.hertzbeat.common.entity.dto.sms.SmslocalSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.TencentSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.TwilioSmsProperties;
import org.apache.hertzbeat.common.entity.dto.sms.UniSmsProperties;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigOptions;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigResponse;
import org.springframework.stereotype.Component;

/** Validates and maps the write-only public contract to the existing runtime models. */
@Component
public class MessageServerConfigMapper {

    private static final Set<String> EMAIL_SECRETS = Set.of("emailPassword");
    private static final Set<String> SMS_TYPES = Set.of("tencent", "alibaba", "unisms", "smslocal", "aws", "twilio");

    public MailServerConfig toEmailConfig(EmailServerConfigRequest request, MailServerConfig existing) {
        require(request.getType(), "type");
        if (request.getType() != 0) {
            throw new IllegalArgumentException("Unsupported email server type");
        }
        require(request.getEmailPort(), "emailPort");
        require(request.getEmailSsl(), "emailSsl");
        require(request.getEmailStarttls(), "emailStarttls");
        require(request.getEnable(), "enable");
        if (request.getEmailPort() < 1 || request.getEmailPort() > 65535) {
            throw new IllegalArgumentException("emailPort is out of range");
        }
        String host = requireText(request.getEmailHost(), "emailHost");
        String username = requireText(request.getEmailUsername(), "emailUsername");
        if (!username.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("emailUsername is invalid");
        }
        validateClears(request.getClearSecrets(), EMAIL_SECRETS);
        String password = secret("emailPassword", request.getEmailPassword(),
                existing == null ? null : existing.getEmailPassword(), request.getClearSecrets());
        if (request.getEnable()) {
            requireText(password, "emailPassword");
        }
        return new MailServerConfig(request.getType(), host, username, password, request.getEmailPort(),
                request.getEmailSsl(), request.getEmailStarttls(), request.getEnable());
    }

    public EmailServerConfigResponse toEmailResponse(MailServerConfig config) {
        Set<String> configured = StringUtils.isBlank(config.getEmailPassword())
                ? Set.of() : Set.of("emailPassword");
        return new EmailServerConfigResponse(config.getType(), config.getEmailHost(), config.getEmailUsername(),
                config.getEmailPort(), config.isEmailSsl(), config.isEmailStarttls(), config.isEnable(), configured);
    }

    public SmsConfig toSmsConfig(SmsServerConfigRequest request, SmsConfig existing) {
        require(request.getEnable(), "enable");
        String type = requireText(request.getType(), "type").toLowerCase();
        if (!SMS_TYPES.contains(type)) {
            throw new IllegalArgumentException("Unsupported SMS provider type");
        }
        SmsServerConfigOptions options = request.getOptions();
        if (options == null) {
            throw new IllegalArgumentException("options is required");
        }
        Set<String> allowed = allowedFields(type);
        Set<String> supplied = suppliedFields(options);
        if (!allowed.containsAll(supplied)) {
            supplied.removeAll(allowed);
            throw new IllegalArgumentException("Unsupported options for SMS provider: " + supplied);
        }
        Set<String> secrets = secretFields(type);
        validateClears(request.getClearSecrets(), secrets);
        SmsConfig target = copySms(existing);
        target.setEnable(request.getEnable());
        target.setType(type);
        applyProvider(target, type, options, request.getClearSecrets(), existing);
        return target;
    }

    public SmsServerConfigResponse toSmsResponse(SmsConfig config) {
        SmsServerConfigOptions options = new SmsServerConfigOptions();
        Set<String> configured = new LinkedHashSet<>();
        switch (config.getType()) {
            case "tencent" -> readTencent(config.getTencent(), options, configured);
            case "alibaba" -> readAlibaba(config.getAlibaba(), options, configured);
            case "unisms" -> readUnisms(config.getUnisms(), options, configured);
            case "smslocal" -> readSmslocal(config.getSmslocal(), configured);
            case "aws" -> readAws(config.getAws(), options, configured);
            case "twilio" -> readTwilio(config.getTwilio(), options, configured);
            default -> throw new IllegalArgumentException("Unsupported SMS provider type");
        }
        return new SmsServerConfigResponse(config.isEnable(), config.getType(), options, configured);
    }

    private void applyProvider(SmsConfig target, String type, SmsServerConfigOptions options,
                               Set<String> clears, SmsConfig existing) {
        switch (type) {
            case "tencent" -> target.setTencent(new TencentSmsProperties(
                    secret("secretId", options.getSecretId(), value(existing, type, "secretId"), clears),
                    secret("secretKey", options.getSecretKey(), value(existing, type, "secretKey"), clears),
                    requireText(options.getAppId(), "appId"), requireText(options.getSignName(), "signName"),
                    requireText(options.getTemplateId(), "templateId")));
            case "alibaba" -> target.setAlibaba(new AlibabaSmsProperties(
                    requireText(options.getAccessKeyId(), "accessKeyId"),
                    secret("accessKeySecret", options.getAccessKeySecret(), value(existing, type, "accessKeySecret"), clears),
                    requireText(options.getSignName(), "signName"), requireText(options.getTemplateCode(), "templateCode")));
            case "unisms" -> applyUnisms(target, options, clears, existing);
            case "smslocal" -> target.setSmslocal(new SmslocalSmsProperties(
                    secret("apiKey", options.getApiKey(), value(existing, type, "apiKey"), clears)));
            case "aws" -> {
                AwsSmsProperties properties = new AwsSmsProperties();
                properties.setAccessKeyId(requireText(options.getAccessKeyId(), "accessKeyId"));
                properties.setAccessKeySecret(secret("accessKeySecret", options.getAccessKeySecret(),
                        value(existing, type, "accessKeySecret"), clears));
                properties.setRegion(requireText(options.getRegion(), "region"));
                target.setAws(properties);
            }
            case "twilio" -> target.setTwilio(new TwilioSmsProperties(
                    requireText(options.getAccountSid(), "accountSid"),
                    secret("authToken", options.getAuthToken(), value(existing, type, "authToken"), clears),
                    requireText(options.getTwilioPhoneNumber(), "twilioPhoneNumber")));
            default -> throw new IllegalArgumentException("Unsupported SMS provider type");
        }
        if (target.isEnable()) {
            secretFields(type).forEach(field -> requireText(value(target, type, field), field));
        }
    }

    private void applyUnisms(SmsConfig target, SmsServerConfigOptions options, Set<String> clears, SmsConfig existing) {
        String authMode = StringUtils.defaultIfBlank(options.getAuthMode(), "simple").trim().toLowerCase();
        if (!Set.of("simple", "hmac").contains(authMode)) {
            throw new IllegalArgumentException("Unsupported UniSMS auth mode");
        }
        String secret = secret("accessKeySecret", options.getAccessKeySecret(),
                value(existing, "unisms", "accessKeySecret"), clears);
        if (target.isEnable() && "hmac".equals(authMode)) {
            requireText(secret, "accessKeySecret");
        }
        target.setUnisms(new UniSmsProperties(requireText(options.getAccessKeyId(), "accessKeyId"), secret,
                requireText(options.getSignature(), "signature"), requireText(options.getTemplateId(), "templateId"), authMode));
    }

    private SmsConfig copySms(SmsConfig existing) {
        SmsConfig target = new SmsConfig();
        if (existing != null) {
            target.setTencent(existing.getTencent());
            target.setAlibaba(existing.getAlibaba());
            target.setUnisms(existing.getUnisms());
            target.setAws(existing.getAws());
            target.setTwilio(existing.getTwilio());
            target.setSmslocal(existing.getSmslocal());
        }
        return target;
    }

    private Set<String> allowedFields(String type) {
        return switch (type) {
            case "tencent" -> Set.of("secretId", "secretKey", "appId", "signName", "templateId");
            case "alibaba" -> Set.of("accessKeyId", "accessKeySecret", "signName", "templateCode");
            case "unisms" -> Set.of("accessKeyId", "accessKeySecret", "signature", "templateId", "authMode");
            case "smslocal" -> Set.of("apiKey");
            case "aws" -> Set.of("accessKeyId", "accessKeySecret", "region");
            case "twilio" -> Set.of("accountSid", "authToken", "twilioPhoneNumber");
            default -> Set.of();
        };
    }

    private Set<String> secretFields(String type) {
        return switch (type) {
            case "tencent" -> Set.of("secretId", "secretKey");
            case "alibaba", "unisms", "aws" -> Set.of("accessKeySecret");
            case "smslocal" -> Set.of("apiKey");
            case "twilio" -> Set.of("authToken");
            default -> Set.of();
        };
    }

    private Set<String> suppliedFields(SmsServerConfigOptions value) {
        Set<String> fields = new LinkedHashSet<>();
        add(fields, "secretId", value.getSecretId());
        add(fields, "secretKey", value.getSecretKey());
        add(fields, "appId", value.getAppId());
        add(fields, "signName", value.getSignName());
        add(fields, "templateId", value.getTemplateId());
        add(fields, "accessKeyId", value.getAccessKeyId());
        add(fields, "accessKeySecret", value.getAccessKeySecret());
        add(fields, "templateCode", value.getTemplateCode());
        add(fields, "signature", value.getSignature());
        add(fields, "authMode", value.getAuthMode());
        add(fields, "apiKey", value.getApiKey());
        add(fields, "region", value.getRegion());
        add(fields, "accountSid", value.getAccountSid());
        add(fields, "authToken", value.getAuthToken());
        add(fields, "twilioPhoneNumber", value.getTwilioPhoneNumber());
        return fields;
    }

    private String value(SmsConfig config, String type, String field) {
        if (config == null) {
            return null;
        }
        return switch (type + ":" + field) {
            case "tencent:secretId" -> config.getTencent() == null ? null : config.getTencent().getSecretId();
            case "tencent:secretKey" -> config.getTencent() == null ? null : config.getTencent().getSecretKey();
            case "alibaba:accessKeySecret" -> config.getAlibaba() == null ? null : config.getAlibaba().getAccessKeySecret();
            case "unisms:accessKeySecret" -> config.getUnisms() == null ? null : config.getUnisms().getAccessKeySecret();
            case "smslocal:apiKey" -> config.getSmslocal() == null ? null : config.getSmslocal().getApiKey();
            case "aws:accessKeySecret" -> config.getAws() == null ? null : config.getAws().getAccessKeySecret();
            case "twilio:authToken" -> config.getTwilio() == null ? null : config.getTwilio().getAuthToken();
            default -> null;
        };
    }

    private void readTencent(TencentSmsProperties value, SmsServerConfigOptions options, Set<String> configured) {
        if (value == null) {
            return;
        }
        options.setAppId(value.getAppId());
        options.setSignName(value.getSignName());
        options.setTemplateId(value.getTemplateId());
        add(configured, "secretId", value.getSecretId());
        add(configured, "secretKey", value.getSecretKey());
    }

    private void readAlibaba(AlibabaSmsProperties value, SmsServerConfigOptions options, Set<String> configured) {
        if (value == null) {
            return;
        }
        options.setAccessKeyId(value.getAccessKeyId());
        options.setSignName(value.getSignName());
        options.setTemplateCode(value.getTemplateCode());
        add(configured, "accessKeySecret", value.getAccessKeySecret());
    }

    private void readUnisms(UniSmsProperties value, SmsServerConfigOptions options, Set<String> configured) {
        if (value == null) {
            return;
        }
        options.setAccessKeyId(value.getAccessKeyId());
        options.setSignature(value.getSignature());
        options.setTemplateId(value.getTemplateId());
        options.setAuthMode(value.getAuthMode());
        add(configured, "accessKeySecret", value.getAccessKeySecret());
    }

    private void readSmslocal(SmslocalSmsProperties value, Set<String> configured) {
        if (value != null) {
            add(configured, "apiKey", value.getApiKey());
        }
    }

    private void readAws(AwsSmsProperties value, SmsServerConfigOptions options, Set<String> configured) {
        if (value == null) {
            return;
        }
        options.setAccessKeyId(value.getAccessKeyId());
        options.setRegion(value.getRegion());
        add(configured, "accessKeySecret", value.getAccessKeySecret());
    }

    private void readTwilio(TwilioSmsProperties value, SmsServerConfigOptions options, Set<String> configured) {
        if (value == null) {
            return;
        }
        options.setAccountSid(value.getAccountSid());
        options.setTwilioPhoneNumber(value.getTwilioPhoneNumber());
        add(configured, "authToken", value.getAuthToken());
    }

    private String secret(String field, String supplied, String existing, Set<String> clears) {
        if (clears.contains(field)) {
            if (StringUtils.isNotBlank(supplied)) {
                throw new IllegalArgumentException("A secret cannot be supplied and cleared together");
            }
            return null;
        }
        return StringUtils.isNotBlank(supplied) ? supplied : existing;
    }

    private void validateClears(Set<String> clears, Set<String> allowed) {
        if (clears == null || !allowed.containsAll(clears)) {
            throw new IllegalArgumentException("Unsupported secret-clear option");
        }
    }

    private <T> T require(T value, String name) {
        if (value == null) { throw new IllegalArgumentException(name + " is required"); }
        return value;
    }

    private String requireText(String value, String name) {
        if (StringUtils.isBlank(value)) { throw new IllegalArgumentException(name + " is required"); }
        return value.trim();
    }

    private void add(Set<String> fields, String name, String value) {
        if (StringUtils.isNotBlank(value)) { fields.add(name); }
    }
}
