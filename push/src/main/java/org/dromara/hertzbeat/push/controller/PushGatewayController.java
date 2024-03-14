package org.dromara.hertzbeat.push.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.push.service.PushGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;

/**
 * push gateway controller
 *
 * @author vinci
 */
@Tag(name = "Metrics Push Gateway API | 监控数据推送网关API")
@RestController
@RequestMapping(value = "/api/push/pushgateway")
public class PushGatewayController {

    @Autowired
    private PushGatewayService pushGatewayService;

    @PostMapping()
    @Operation(summary = "Push metric data to hertzbeat pushgateway", description = "推送监控数据到hertzbeat推送网关")
    public ResponseEntity<Message<Void>> pushMetrics(HttpServletRequest request) throws IOException {
        InputStream inputStream = request.getInputStream();
        boolean result = pushGatewayService.pushMetricsData(inputStream);
        if (result) {
            return ResponseEntity.ok(Message.success("Push success"));
        }
        else {
            return ResponseEntity.ok(Message.success("Push failed"));
        }
    }

}
