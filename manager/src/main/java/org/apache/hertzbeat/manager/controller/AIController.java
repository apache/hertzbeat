package org.apache.hertzbeat.manager.controller;

import com.alibaba.fastjson.JSON;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.AIResponse;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * AI Management API
 */
@Tag(name = "AI Manage API")
@RestController
@RequestMapping(value = "/api/ai", produces = {APPLICATION_JSON_VALUE})
@Slf4j
public class AIController {

    @Resource(name = "chatGptServiceImpl")
    private AIService aiService;


    @GetMapping(path = "/test")
    @Operation(summary = "Obtain monitoring information based on monitoring ID", description = "Obtain monitoring information based on monitoring ID")
    public ResponseEntity<String> getMonitor(
            @Parameter(description = "Monitoring task ID", example = "6565463543") @RequestParam("param") String param) {

        AIResponse aiResponse = aiService.aiResponse(param);
        return  ResponseEntity.ok(JSON.toJSONString(aiResponse));
    }
}
