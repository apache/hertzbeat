package org.apache.hertzbeat.alert.controller;

import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;
import java.util.UUID;
import org.apache.hertzbeat.alert.config.AlertSseManager;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.common.util.SnowFlakeIdWorker;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping(path = "/api/alert/sse", produces = {TEXT_EVENT_STREAM_VALUE})
public class AlertSseController {

    private final AlertSseManager emitterManager;

    public AlertSseController(AlertSseManager emitterManager) {
        this.emitterManager = emitterManager;
    }

    @GetMapping(path = "/subscribe")
    public SseEmitter subscribe() {
        Long clientId = SnowFlakeIdGenerator.generateId();
        return emitterManager.createEmitter(clientId);
    }
}