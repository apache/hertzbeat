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

package org.dromara.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dto.CloudAlertReportAbstract;
import org.dromara.hertzbeat.alert.dto.GeneralCloudAlertReport;
import org.dromara.hertzbeat.alert.enums.CloudServiceAlarmInformationEnum;
import org.dromara.hertzbeat.alert.service.AlertService;
import org.dromara.hertzbeat.common.entity.dto.AlertReport;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Optional;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Extern Alarm Manage API
 * @author zqr10159
 */
@Tag(name = "Extern Alarm Manage API | 第三方告警管理API")
@RestController
@RequestMapping(path = "/api/alerts/report", produces = {APPLICATION_JSON_VALUE})
@Slf4j
public class AlertReportController {

    @Autowired
    private AlertService alertService;

    @PostMapping("/{cloud}")
    @Operation(summary = "Interface for reporting external alarm information of cloud service ｜ 对外上报告警信息接口")
    public ResponseEntity<Message<Void>> addNewAlertReportFromCloud(@PathVariable("cloud") String cloudServiceName,
                                                                    @RequestBody String alertReport) {
        // 根据枚举获取到对应的枚举对象
        CloudServiceAlarmInformationEnum cloudService = CloudServiceAlarmInformationEnum
                .getEnumFromCloudServiceName(cloudServiceName);

        AlertReport alert = null;
        // 校验是否存在对应的对象
        if (cloudService != null) {
            try {
                // 实例化对应的Class
                CloudAlertReportAbstract cloudAlertReport = JsonUtil
                        .fromJson(alertReport, cloudService.getCloudServiceAlarmInformationEntity());
                // 模板填充
                assert cloudAlertReport != null;
                alert = AlertReport.builder()
                        .content(cloudAlertReport.getContent())
                        .alertName(cloudAlertReport.getAlertName())
                        .alertTime(cloudAlertReport.getAlertTime())
                        .alertDuration(cloudAlertReport.getAlertDuration())
                        .priority(cloudAlertReport.getPriority())
                        .reportType(cloudAlertReport.getReportType())
                        .labels(cloudAlertReport.getLabels())
                        .annotations(cloudAlertReport.getAnnotations())
                        .build();
            } catch (Exception e) {
                log.error("[AlertReportController]：解析云服务告警内容失败！云服务商：" +
                        cloudService.name() + ";传入JSON字符串：" + alertReport);
            }
        } else {
            // 用户异常使用第三方接入API告警
            alert = AlertReport.builder()
                    .content("第三方告警API接入异常：不存在该API，详情请看文档")
                    .alertName("/api/alerts/report/" + cloudServiceName)
                    .alertTime(new Date().getTime())
                    .priority(1)
                    .reportType(1)
                    .build();
        }
        // 异常判断是否为空
        Optional.ofNullable(alert).ifPresent(alertReportPresent ->
                alertService.addNewAlertReport(alertReportPresent));
        return ResponseEntity.ok(Message.success("Add report success"));
    }
    
    @PostMapping
    @Operation(summary = "Interface for reporting external and general alarm information ｜ 对外上报告警信息 接口",
            description = "对外 新增一个云服务通用告警")
    public ResponseEntity<Message<Void>> addNewAlertReport(@RequestBody GeneralCloudAlertReport alertReport) {
        try {
            alertReport.refreshAlertTime();
        } catch (Exception e) {
            log.error("[AlertReportController]：" + e.getMessage() +
                    ",请求实体：" + JsonUtil.toJson(alertReport));
            throw e;
        }
        alertService.addNewAlertReport(alertReport);
        return ResponseEntity.ok(Message.success("Add report success"));
    }
}
