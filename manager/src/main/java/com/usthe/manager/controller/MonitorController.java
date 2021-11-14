package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.service.MonitorService;
import io.swagger.annotations.Api;
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

import static com.usthe.common.util.CommonConstants.MONITOR_NOT_EXIST;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 监控管理API
 *
 *
 */
@Api(tags = "监控管理接口")
@RestController
@RequestMapping(path = "/monitor", consumes = {APPLICATION_JSON_VALUE}, produces = {APPLICATION_JSON_VALUE})
public class MonitorController {

    @Autowired
    private MonitorService monitorService;

    @PostMapping
    public ResponseEntity<Message<Void>> addNewMonitor(@RequestBody MonitorDto monitorDto) {
        // 校验请求数据
        monitorService.validate(monitorDto, false);
        if (monitorDto.isDetected()) {
            // 进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        }
        monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok().build();
    }

    @PutMapping
    public ResponseEntity<Message<Void>> modifyMonitor(@RequestBody MonitorDto monitorDto) {
        // 校验请求数据
        monitorService.validate(monitorDto, true);
        if (monitorDto.isDetected()) {
            // 进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        }
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Modify success"));
    }

    @GetMapping(path = "/{id}")
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
    public ResponseEntity<Message<Void>> deleteMonitor(@PathVariable("id") long id) {
        // 删除监控,监控不存在或删除成功都返回成功
        monitorService.deleteMonitor(id);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @PostMapping(path = "/detect")
    public ResponseEntity<Message<Void>> detectMonitor(@RequestBody MonitorDto monitorDto) {
        monitorService.validate(monitorDto, false);
        monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(new Message<>("Detect success."));
    }

}
