package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.service.MonitorService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

import static com.usthe.common.util.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Monitoring management API
 * 监控管理API
 *
 * @author tomsun28
 * @date 2021/11/14 10:57
 */
@Api(tags = "Monitor Manage API | 监控管理API")
@RestController
@RequestMapping(path = "/monitor", produces = {APPLICATION_JSON_VALUE})
public class MonitorController {

    @Autowired
    private MonitorService monitorService;

    @PostMapping
    @ApiOperation(value = "Add a monitoring application", notes = "新增一个监控应用")
    public ResponseEntity<Message<Void>> addNewMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        // Verify request data  校验请求数据
        monitorService.validate(monitorDto, false);
        if (monitorDto.isDetected()) {
            // Probe    进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        }
        monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping
    @ApiOperation(value = "Modify an existing monitoring application", notes = "修改一个已存在监控应用")
    public ResponseEntity<Message<Void>> modifyMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        // Verify request data  校验请求数据
        monitorService.validate(monitorDto, true);
        if (monitorDto.isDetected()) {
            // Probe    进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        }
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @ApiOperation(value = "Obtain monitoring information based on monitoring ID", notes = "根据监控ID获取监控信息")
    public ResponseEntity<Message<MonitorDto>> getMonitor(
            @ApiParam(value = "监控ID", example = "6565463543") @PathVariable("id") final long id) {
        // Get monitoring information
        // 获取监控信息
        MonitorDto monitorDto = monitorService.getMonitorDto(id);
        Message.MessageBuilder<MonitorDto> messageBuilder = Message.builder();
        if (monitorDto == null) {
            messageBuilder.code(MONITOR_NOT_EXIST_CODE).msg("Monitor not exist.");
        } else {
            messageBuilder.data(monitorDto);
        }
        return ResponseEntity.ok(messageBuilder.build());
    }

    @DeleteMapping(path = "/{id}")
    @ApiOperation(value = "Delete monitoring application based on monitoring ID", notes = "根据监控ID删除监控应用")
    public ResponseEntity<Message<Void>> deleteMonitor(
            @ApiParam(value = "en: Monitor ID,zh: 监控ID", example = "6565463543") @PathVariable("id") final long id) {
        // delete monitor 删除监控
        Monitor monitor = monitorService.getMonitor(id);
        if (monitor == null) {
            return ResponseEntity.ok(new Message<>("The specified monitoring was not queried, please check whether the parameters are correct"));
        }
        monitorService.deleteMonitor(id);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @PostMapping(path = "/detect")
    @ApiOperation(value = "Perform availability detection on this monitoring based on monitoring information", notes = "根据监控信息去对此监控进行可用性探测")
    public ResponseEntity<Message<Void>> detectMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        monitorService.validate(monitorDto, null);
        monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Detect success."));
    }

}
