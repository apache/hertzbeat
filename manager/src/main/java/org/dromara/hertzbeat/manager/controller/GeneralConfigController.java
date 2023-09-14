package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.manager.service.GeneralConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alert sender Configuration API
 * 告警发送端配置API
 *
 * @author zqr10159
 */
@RestController
@RequestMapping(value = "/api/config", produces = {APPLICATION_JSON_VALUE})
@Tag(name = "Alert sender Configuration API | 告警发送端配置API")
@Slf4j
public class GeneralConfigController {
    private Map<String, GeneralConfigService> configServiceMap;

    public GeneralConfigController(List<GeneralConfigService> generalConfigServices) {
        configServiceMap = new HashMap<>(8);
        if (generalConfigServices != null) {
            generalConfigServices.forEach(config -> configServiceMap.put(config.type(), config));
        }
    }

    @PostMapping(path = "/{type}")
    @Operation(summary = "Save the sender config", description = "保存公共配置")
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
    @Operation(summary = "Get the sender config", description = "获取发送端配置")
    public ResponseEntity<Message<Object>> getConfig(
            @Parameter(description = "Config Type", example = "email")
            @PathVariable("type") @NotNull final String type) {
        GeneralConfigService configService = configServiceMap.get(type);
        if (configService == null) {
            throw new IllegalArgumentException("Not supported this config type: " + type);
        }
        return ResponseEntity.ok(Message.success(configService.getConfig()));
    }
}
