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

package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.common.util.CommonConstants;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.manager.pojo.dto.MonitorDefineDto;
import com.usthe.manager.service.AppService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Monitoring Type Management API
 * 监控类型管理API
 * @author tomsun28
 * @date 2021/11/14 16:47
 */
@Tag(name = "Monitor Type Manage API | 监控类型管理API")
@RestController
@RequestMapping(path = "/api/apps", produces = {APPLICATION_JSON_VALUE})
public class AppController {

    @Autowired
    private AppService appService;

    @GetMapping(path = "/{app}/params")
    @Operation(summary = "The structure of the input parameters required to specify the monitoring type according to the app query", description = "根据app查询指定监控类型的需要输入参数的结构")
    public ResponseEntity<Message<List<ParamDefine>>> queryAppParamDefines(
            @Parameter(description = "en: Monitoring type name,zh: 监控类型名称", example = "api") @PathVariable("app") final String app) {
        List<ParamDefine> paramDefines = appService.getAppParamDefines(app.toLowerCase());
        return ResponseEntity.ok(new Message<>(paramDefines));
    }

    @GetMapping(path = "/{app}/define")
    @Operation(summary = "The definition structure of the specified monitoring type according to the app query", description = "根据app查询指定监控类型的定义结构")
    public ResponseEntity<Message<Job>> queryAppDefine(
            @Parameter(description = "en: Monitoring type name,zh: 监控类型名称", example = "api") @PathVariable("app") final String app) {
        Job define = appService.getAppDefine(app.toLowerCase());
        return ResponseEntity.ok(new Message<>(define));
    }

    @GetMapping(path = "/{app}/define/yml")
    @Operation(summary = "The definition yml of the specified monitoring type according to the app query", description = "根据app查询指定监控类型的定义YML")
    public ResponseEntity<Message<String>> queryAppDefineYml(
            @Parameter(description = "en: Monitoring type name,zh: 监控类型名称", example = "api") @PathVariable("app") final String app) {
        String defineContent = appService.getMonitorDefineFileContent(app);
        return ResponseEntity.ok(Message.<String>builder().data(defineContent).build());
    }

    @DeleteMapping(path = "/{app}/define/yml")
    @Operation(summary = "Delete monitor define yml", description = "根据app删除指定监控类型的定义YML")
    public ResponseEntity<Message<Void>> deleteAppDefineYml(
            @Parameter(description = "en: Monitoring type name,zh: 监控类型名称", example = "api") @PathVariable("app") final String app) {
        try {
            appService.deleteMonitorDefine(app);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.<Void>builder()
                    .code(CommonConstants.FAIL_CODE)
                    .msg(e.getMessage()).build());
        }
        return ResponseEntity.ok(Message.<Void>builder().build());
    }

    @PostMapping(path = "/define/yml")
    @Operation(summary = "Save and apply monitoring type define yml", description = "保存并应用监控类型的定义YML")
    public ResponseEntity<Message<Void>> applyAppDefineYml(@RequestBody MonitorDefineDto defineDto) {
        try {
            appService.applyMonitorDefineYml(defineDto.getDefine());
        } catch (Exception e) {
            return ResponseEntity.ok(Message.<Void>builder()
                            .code(CommonConstants.FAIL_CODE)
                            .msg(e.getMessage()).build());
        }
        return ResponseEntity.ok(Message.<Void>builder().build());
    }

    @GetMapping(path = "/hierarchy")
    @Operation(summary = "Query all monitored types-indicator group-indicator level, output in a hierarchical structure", description = "查询所有监控的类型-指标组-指标层级,以层级结构输出")
    public ResponseEntity<Message<List<Hierarchy>>> queryAppsHierarchy(
            @Parameter(description = "en: language type,zh: 语言类型",
                    example = "zh-CN")
            @RequestParam(name = "lang", required = false) String lang) {
        if (lang == null || "".equals(lang)) {
            lang = "zh-CN";
        }
        if (lang.contains(Locale.ENGLISH.getLanguage())) {
            lang = "en-US";
        } else if (lang.contains(Locale.CHINESE.getLanguage())) {
            lang = "zh-CN";
        } else {
            lang = "en-US";
        }
        List<Hierarchy> appHierarchies = appService.getAllAppHierarchy(lang);
        return ResponseEntity.ok(new Message<>(appHierarchies));
    }
}
