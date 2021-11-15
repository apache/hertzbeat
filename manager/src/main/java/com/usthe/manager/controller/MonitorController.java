package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.service.MonitorService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.usthe.common.util.CommonConstants.MONITOR_NOT_EXIST;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 监控管理API
 * @author tomsun28
 * @date 2021/11/14 10:57
 */
@Api(tags = "监控管理API")
@RestController
@RequestMapping(path = "/monitor", produces = {APPLICATION_JSON_VALUE})
@Validated
public class MonitorController {

    @Autowired
    private MonitorService monitorService;

    @PostMapping
    @ApiOperation(value = "新增监控", notes = "新增一个监控应用")
    public ResponseEntity<Message<Void>> addNewMonitor(@Validated @RequestBody MonitorDto monitorDto) {
        // 校验请求数据
        monitorService.validate(monitorDto, false);
        if (monitorDto.getDetected()) {
            // 进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        }
        monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping
    @ApiOperation(value = "修改监控", notes = "修改一个已存在监控应用")
    public ResponseEntity<Message<Void>> modifyMonitor(@Validated @RequestBody MonitorDto monitorDto) {
        // 校验请求数据
        monitorService.validate(monitorDto, true);
        if (monitorDto.getDetected()) {
            // 进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        }
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @ApiOperation(value = "查询监控", notes = "根据监控ID获取监控信息")
    public ResponseEntity<Message<MonitorDto>> getMonitor(@PathVariable("id") long id) {
        // 获取监控信息
        MonitorDto monitorDto = monitorService.getMonitor(id);
        Message.MessageBuilder<MonitorDto> messageBuilder = Message.builder();
        if (monitorDto == null) {
            messageBuilder.code(MONITOR_NOT_EXIST).msg("Monitor not exist.");
        } else {
            messageBuilder.data(monitorDto);
        }
        return ResponseEntity.ok(messageBuilder.build());
    }

    @DeleteMapping(path = "/{id}")
    @ApiOperation(value = "删除监控", notes = "根据监控ID删除监控应用,监控不存在也是删除成功")
    public ResponseEntity<Message<Void>> deleteMonitor(@PathVariable("id") long id) {
        // 删除监控,监控不存在或删除成功都返回成功
        monitorService.deleteMonitor(id);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @PostMapping(path = "/detect")
    @ApiOperation(value = "探测监控", notes = "根据监控信息去对此监控进行可用性探测")
    public ResponseEntity<Message<Void>> detectMonitor(@Validated @RequestBody MonitorDto monitorDto) {
        monitorService.validate(monitorDto, false);
        monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Detect success."));
    }

}
