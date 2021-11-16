package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.pojo.entity.ParamDefine;
import com.usthe.manager.service.AppService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 监控类型管理API
 * @author tomsun28
 * @date 2021/11/14 16:47
 */
@Api(tags = "监控类型管理API")
@RestController
@RequestMapping(path = "/apps", produces = {APPLICATION_JSON_VALUE})
public class AppController {

    @Autowired
    private AppService appService;

    @GetMapping(path = "/{app}/params")
    @ApiOperation(value = "查询监控类型的参数结构", notes = "根据app查询指定监控类型的需要输入参数的结构")
    public ResponseEntity<Message<List<ParamDefine>>> queryAppParamDefines(
            @ApiParam(value = "监控类型名称", example = "api") @PathVariable("app") String app) {
        List<ParamDefine> paramDefines = appService.getAppParamDefines(app);
        return ResponseEntity.ok(new Message<>(paramDefines));
    }

    @GetMapping
    @ApiOperation(value = "查询全部层级的监控类型", notes = "查询所有监控类型,以层级结构输出")
    public ResponseEntity<Message<Object>> queryAppsHierarchy() {

        return null;
    }

}
