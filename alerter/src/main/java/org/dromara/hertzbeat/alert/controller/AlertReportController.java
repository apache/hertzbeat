package org.dromara.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.alert.service.impl.AlertConvertTenCloudServiceImpl;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * @author zqr10159
 * 第三方告警上报接口
 */
@Tag(name = "Extern Alarm Manage API | 第三方告警管理API")
@RestController
@RequestMapping(path = "/api/alerts/report", produces = {APPLICATION_JSON_VALUE})
public class AlertReportController {
    
    @Autowired
    AlertConvertTenCloudServiceImpl alertConvertTenCloudService;
    
    @Autowired
    private AlertService alertService;
    
    @PostMapping("/tencloud")
    @Operation(summary = "Interface for reporting external alarm information of tencloud ｜ 对外上报告警信息 接口",
            description = "对外 新增一个腾讯云告警")
    public ResponseEntity<Message<Void>> addNewAlertReportTencent(@Valid @RequestBody String alertReport) {
        AlertReport convert = alertConvertTenCloudService.convert(alertReport);
        alertService.addNewAlertReport(convert);
        return ResponseEntity.ok(new Message<>("Add report success"));
    }
    
    @PostMapping
    @Operation(summary = "Interface for reporting external alarm information ｜ 对外上报告警信息 接口",
            description = "对外 新增一个告警")
    public ResponseEntity<Message<Void>> addNewAlertReport(@Valid @RequestBody AlertReport alertReport) {
        // 校验请求数据 TODO
        alertService.addNewAlertReport(alertReport);
        return ResponseEntity.ok(new Message<>("Add report success"));
    }
}
