package org.dromara.hertzbeat.push.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.push.PushMetricsDto;
import org.dromara.hertzbeat.push.service.PushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * push controller
 *
 * @author vinci
 */
@Tag(name = "Metrics Push API | 监控数据推送API")
@RestController
@RequestMapping(value = "/api/push", produces = {APPLICATION_JSON_VALUE})
public class PushController {

    @Autowired
    private PushService pushService;

    @PostMapping
    @Operation(summary = "Push metric data to hertzbeat", description = "推送监控数据到hertzbeat")
    public ResponseEntity<Message<Void>> pushMetrics(@RequestBody PushMetricsDto pushMetricsDto) {
        pushService.pushMetricsData(pushMetricsDto);
        return ResponseEntity.ok(Message.success("Push success"));
    }

    @GetMapping()
    @Operation(summary = "Get metric data for hertzbeat", description = "获取监控数据")
    public ResponseEntity<Message<PushMetricsDto>> getMetrics(
            @Parameter(description = "监控id", example = "6565463543") @RequestParam("id") final Long id,
            @Parameter(description = "上一次拉取的时间", example = "6565463543") @RequestParam("time") final Long time) {
        PushMetricsDto pushMetricsDto = pushService.getPushMetricData(id, time);
        return ResponseEntity.ok(Message.success(pushMetricsDto));
    }
}
