package org.apache.hertzbeat.alert.config;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SSE manager for alert
 */
@Component
public class AlertSseManager {
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(Long clientId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> removeEmitter(clientId));
        emitter.onTimeout(() -> removeEmitter(clientId));
        emitters.put(clientId, emitter);
        return emitter;
    }

    @Async
    public void broadcast(String data) {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(String.valueOf(System.currentTimeMillis()))
                        .name("ALERT_EVENT")
                        .data(data));
            } catch (IOException e) {
                emitter.complete();
                removeEmitter(clientId);
            }
        });
    }

    private void removeEmitter(Long clientId) {
        emitters.remove(clientId);
    }
}