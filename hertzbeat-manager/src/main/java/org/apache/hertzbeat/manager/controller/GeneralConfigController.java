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

package org.apache.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.constraints.NotNull;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.ResponseUtil;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.EmailServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.MessageServerConfigResult;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.SmsServerConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfig;
import org.apache.hertzbeat.manager.pojo.dto.SystemConfigRequest;
import org.apache.hertzbeat.manager.service.ConfigService;
import org.apache.hertzbeat.manager.service.MessageServerConfigService;
import org.apache.hertzbeat.manager.service.SystemConfigService;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.TextStyle;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;

/**
 * Generate Configuration API
 */
@RestController
@RequestMapping(value = "/api/config", produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Generate Configuration API")
@Slf4j
public class GeneralConfigController {

    private static final Set<String> ZONE_IDS = ZoneId.getAvailableZoneIds();

    @Resource
    private ConfigService configService;

    @Resource
    private MessageServerConfigService messageServerConfigService;

    @Resource
    private SystemConfigService systemConfigService;

    @PostMapping(path = "/system")
    @Operation(summary = "Save the system config")
    public ResponseEntity<Message<SystemConfig>> saveSystemConfig(@RequestBody SystemConfigRequest request) {
        return handleSystemConfig(() -> systemConfigService.saveAndGetConfig(request));
    }

    @GetMapping(path = "/system")
    @Operation(summary = "Get the system config")
    public ResponseEntity<Message<SystemConfig>> getSystemConfig() {
        return handleSystemConfig(systemConfigService::getConfig);
    }

    @PostMapping(path = "/email")
    @Operation(summary = "Save the email server config")
    public ResponseEntity<Message<MessageServerConfigResult<EmailServerConfigResponse>>> saveEmailConfig(
            @RequestBody EmailServerConfigRequest request) {
        return handleMessageServer(() -> messageServerConfigService.saveEmailConfig(request));
    }

    @GetMapping(path = "/email")
    @Operation(summary = "Get the email server config")
    public ResponseEntity<Message<MessageServerConfigResult<EmailServerConfigResponse>>> getEmailConfig() {
        return handleMessageServer(messageServerConfigService::getEmailConfig);
    }

    @PostMapping(path = "/sms")
    @Operation(summary = "Save the SMS server config")
    public ResponseEntity<Message<MessageServerConfigResult<SmsServerConfigResponse>>> saveSmsConfig(
            @RequestBody SmsServerConfigRequest request) {
        return handleMessageServer(() -> messageServerConfigService.saveSmsConfig(request));
    }

    @GetMapping(path = "/sms")
    @Operation(summary = "Get the SMS server config")
    public ResponseEntity<Message<MessageServerConfigResult<SmsServerConfigResponse>>> getSmsConfig() {
        return handleMessageServer(messageServerConfigService::getSmsConfig);
    }


    @PostMapping(path = "/{type}")
    @Operation(summary = "Save or update common config", description = "Save or update common config")
    public ResponseEntity<Message<String>> saveOrUpdateConfig(
            @Parameter(description = "Config Type", example = "email")
            @PathVariable("type") @NotNull final String type,
            @RequestBody Object config) {
        configService.saveConfig(type, config);
        return ResponseEntity.ok(Message.success("Update config success"));
    }

    @GetMapping(path = "/{type}")
    @Operation(summary = "Get the sender config", description = "Get the sender config")
    public ResponseEntity<Message<Object>> getConfig(
            @Parameter(description = "Config Type", example = "email")
            @PathVariable("type") @NotNull final String type) {
        return ResponseUtil.handle(() -> configService.getConfig(type));
    }

    @PutMapping(path = "/template/{app}")
    @Operation(summary = "Update the app template config")
    public ResponseEntity<Message<Void>> updateTemplateAppConfig(
            @PathVariable("app") @NotNull final String app,
            @RequestBody TemplateConfig.AppTemplate template) {
        return ResponseUtil.handle(() -> configService.updateTemplateAppConfig(app, template));
    }

    @GetMapping(path = "/timezones")
    @Operation(summary = "Get all available timezones and their current UTC offset", description = "Get all available timezones and their current UTC offset")
    public ResponseEntity<Message<List<Map<String, String>>>> getTimezones() {
        List<Map<String, String>> timezones = ZONE_IDS.stream()
                .map(id -> {
                    try {
                        ZoneId zoneId = ZoneId.of(id);
                        ZonedDateTime now = ZonedDateTime.now(zoneId);
                        int totalSeconds = now.getOffset().getTotalSeconds();
                        String offset = String.format("UTC%+03d:%02d", totalSeconds / 3600, Math.abs((totalSeconds / 60) % 60));
                        String displayName = zoneId.getDisplayName(TextStyle.FULL, Locale.getDefault());
                        return Map.of("zoneId", id, "offset", offset, "displayName", displayName);
                    } catch (Exception e) {
                        String errorMsg = CommonUtil.getMessageFromThrowable(e);
                        log.warn("Query Timezone failed. {} ", errorMsg);
                        return null;
                    }
                })
                .filter(t -> Objects.nonNull(t) && Objects.nonNull(t.get("zoneId")))
                .sorted(Comparator.comparing(m -> m.get("zoneId")))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Message.success(timezones));
    }

    private <T> ResponseEntity<Message<T>> handleMessageServer(Supplier<T> action) {
        try {
            return ResponseEntity.ok(Message.success(action.get()));
        } catch (DataAccessException exception) {
            log.error("Message server storage unavailable: {}", exception.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Message server storage unavailable"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Invalid message server config"));
        } catch (Exception exception) {
            log.error("Message server config error: {}", exception.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Message server config error"));
        }
    }

    private <T> ResponseEntity<Message<T>> handleSystemConfig(Supplier<T> action) {
        try {
            return ResponseEntity.ok(Message.success(action.get()));
        } catch (DataAccessException exception) {
            log.error("System config storage unavailable: {}", exception.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "System config storage unavailable"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "Invalid system config"));
        } catch (Exception exception) {
            log.error("System config error: {}", exception.getClass().getSimpleName());
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "System config error"));
        }
    }
}
