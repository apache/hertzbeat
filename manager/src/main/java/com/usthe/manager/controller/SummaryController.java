package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.pojo.dto.AppCount;
import com.usthe.manager.pojo.dto.Dashboard;
import com.usthe.manager.service.MonitorService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * System Summary Statistics API
 * 系统摘要统计API
 *
 * @author tom
 * @date 2021/12/7 15:57
 */
@Api(tags = "Summary Statistics API | 系统摘要统计API")
@RestController
@RequestMapping(path = "/summary", produces = {APPLICATION_JSON_VALUE})
public class SummaryController {

    @Autowired
    private MonitorService monitorService;

    @GetMapping
    @ApiOperation(value = "Query all application category monitoring statistics", notes = "查询所有应用类别监控统计信息")
    public ResponseEntity<Message<Dashboard>> appMonitors() {
        List<AppCount> appsCount = monitorService.getAllAppMonitorsCount();
        Message<Dashboard> message = new Message<>(new Dashboard(appsCount));
        return ResponseEntity.ok(message);
    }

}
