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

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.GeneralConfigService;
import org.apache.hertzbeat.manager.service.impl.TemplateConfigServiceImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Alert sender Configuration API
 */
@RestController
@RequestMapping(value = "/api/config", produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Alert sender Configuration API")
@Slf4j
public class GeneralConfigController {
    private final Map<String, GeneralConfigService> configServiceMap;

    public GeneralConfigController(List<GeneralConfigService> generalConfigServices) {
        configServiceMap = new HashMap<>(8);
        if (generalConfigServices != null) {
            generalConfigServices.forEach(config -> configServiceMap.put(config.type(), config));
        }
    }

    @PostMapping(path = "/{type}")
    @Operation(summary = "Save or update common config", description = "Save or update common config")
    public ResponseEntity<Message<String>> saveOrUpdateConfig(
            @Parameter(description = "Config Type", example = "email")
            @PathVariable("type") @NotNull final String type,
            @RequestBody Object config) {
        GeneralConfigService configService = configServiceMap.get(type);
        if (configService == null) {
            throw new IllegalArgumentException("Not supported this config type: " + type);
        }
        configService.saveConfig(config);
        return ResponseEntity.ok(Message.success("Update config success"));
    }

    @GetMapping(path = "/{type}")
    @Operation(summary = "Get the sender config", description = "Get the sender config")
    public ResponseEntity<Message<Object>> getConfig(
            @Parameter(description = "Config Type", example = "email")
            @PathVariable("type") @NotNull final String type) {
        GeneralConfigService configService = configServiceMap.get(type);
        if (configService == null) {
            throw new IllegalArgumentException("Not supported this config type: " + type);
        }
        return ResponseEntity.ok(Message.success(configService.getConfig()));
    }

    @PutMapping(path = "/template/{app}")
    @Operation(summary = "Update the app template config")
    public ResponseEntity<Message<Void>> updateTemplateAppConfig(
            @PathVariable("app") @NotNull final String app,
            @RequestBody TemplateConfig.AppTemplate template) {
        GeneralConfigService configService = configServiceMap.get("template");
        if (configService == null || !(configService instanceof TemplateConfigServiceImpl)) {
            throw new IllegalArgumentException("Not supported this config type: template");
        }
        TemplateConfig config = ((TemplateConfigServiceImpl) configService).getConfig();
        if (config == null) {
            config = new TemplateConfig();
        }
        if (config.getApps() == null) {
            config.setApps(new HashMap<>(8));
        }
        config.getApps().put(app, template);
        configService.saveConfig(config);
        return ResponseEntity.ok(Message.success());
    }
}
