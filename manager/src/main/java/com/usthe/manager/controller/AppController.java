package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.manager.service.AppService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Monitoring Type Management API
 * 监控类型管理API
 *
 * @author tomsun28
 * @date 2021/11/14 16:47
 */
@Api(tags = "Monitor Type Manage API | 监控类型管理API")
@RestController
@RequestMapping(path = "/apps", produces = {APPLICATION_JSON_VALUE})
public class AppController {

    @Autowired
    private AppService appService;

    @GetMapping(path = "/{app}/params")
    @ApiOperation(value = "The structure of the input parameters required to specify the monitoring type according to the app query", notes = "根据app查询指定监控类型的需要输入参数的结构")
    public ResponseEntity<Message<List<ParamDefine>>> queryAppParamDefines(
            @ApiParam(value = "en: Monitoring type name,zh: 监控类型名称", example = "api") @PathVariable("app") final String app) {
        List<ParamDefine> paramDefines = appService.getAppParamDefines(app.toLowerCase());
        return ResponseEntity.ok(new Message<>(paramDefines));
    }

    @GetMapping(path = "/{app}/define")
    @ApiOperation(value = "The definition structure of the specified monitoring type according to the app query", notes = "根据app查询指定监控类型的定义结构")
    public ResponseEntity<Message<Job>> queryAppDefine(
            @ApiParam(value = "en: Monitoring type name,zh: 监控类型名称", example = "api") @PathVariable("app") final String app) {
        Job define = appService.getAppDefine(app.toLowerCase());
        return ResponseEntity.ok(new Message<>(define));
    }

    @GetMapping(path = "/hierarchy")
    @ApiOperation(value = "Query all monitored types-indicator group-indicator level, output in a hierarchical structure", notes = "查询所有监控的类型-指标组-指标层级,以层级结构输出")
    public ResponseEntity<Message<List<Hierarchy>>> queryAppsHierarchy(
            @ApiParam(value = "en: language type,zh: 语言类型",
                    example = "zh-CN", defaultValue = "zh-CN")
            @RequestParam(name = "lang", required = false) String lang) {
        if (lang == null || "".equals(lang)) {
            lang = "zh-CN";
        }
        lang = "zh-cn".equalsIgnoreCase(lang) ? "zh-CN" : lang;
        lang = "en-us".equalsIgnoreCase(lang) ? "en-US" : lang;
        List<Hierarchy> appHierarchies = appService.getAllAppHierarchy(lang);
        return ResponseEntity.ok(new Message<>(appHierarchies));
    }

}
