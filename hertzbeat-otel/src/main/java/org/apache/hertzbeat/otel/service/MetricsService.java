package org.apache.hertzbeat.otel.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.job.Job;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

/**
 * Service for managing and recording Micrometer metrics.
 * This service uses Micrometer which integrates natively with Spring Boot Actuator.
 */
@Service
@Slf4j
public class MetricsService {

    private final MeterRegistry meterRegistry;

    public MetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        log.info("MetricsService initialized with MeterRegistry: {}", meterRegistry.getClass().getSimpleName());
    }

    /**
     * Records the metrics for a completed collection sub-task.
     *
     * @param job            The parent job containing monitor info.
     * @param durationMillis The duration of the collection task in milliseconds.
     * @param status         The final status of the collection ("success", "fail", "timeout").
     */
    public void recordCollectMetrics(Job job, long durationMillis, String status) {
        if (job == null) {
            return;
        }

        Map<String, String> metadata = job.getMetadata();
        String monitorName = metadata != null ? metadata.get("instancename") : "unknown";
        String monitorTarget = metadata != null ? metadata.get("instancehost") : "unknown";

        // Record collection count
        Counter.builder("hertzbeat.collect.total")
                .description("The total number of collection tasks executed")
                .tag("status", status)
                .tag("monitor_type", job.getApp())
                .tag("monitor_id", String.valueOf(job.getMonitorId()))
                .tag("monitor_name", monitorName)
                .tag("monitor_target", monitorTarget)
                .register(meterRegistry)
                .increment();

        // Record collection duration
        Timer.builder("hertzbeat.collect.duration")
                .description("The duration of collection task executions")
                .tag("status", status)
                .tag("monitor_type", job.getApp())
                .tag("monitor_id", String.valueOf(job.getMonitorId()))
                .tag("monitor_name", monitorName)
                .tag("monitor_target", monitorTarget)
                .register(meterRegistry)
                .record(Duration.ofMillis(durationMillis));

        if (log.isDebugEnabled()) {
            log.debug("Recorded metrics for monitor [{}] ({}): status={}, duration={}ms",
                    monitorName, job.getMonitorId(), status, durationMillis);
        }
    }
}