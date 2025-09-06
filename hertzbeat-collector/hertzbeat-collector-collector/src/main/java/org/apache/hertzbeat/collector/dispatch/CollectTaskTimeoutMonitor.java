package org.apache.hertzbeat.collector.dispatch;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.metrics.HertzBeatMetricsCollector;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 *
 */
@Slf4j
@Component
public class CollectTaskTimeoutMonitor {
    /**
     * Collection task timeout value
     */
    private static final long DURATION_TIME = 240_000L;
    /**
     * Metrics task and start time mapping map
     */
    private final Map<String, MetricsTime> metricsTimeoutMonitorMap = new ConcurrentHashMap<>(16);

    @Autowired
    private HertzBeatMetricsCollector metricsCollector;
    private CommonDispatcher commonDispatcher;

    public void start(CommonDispatcher commonDispatcher) {
        this.commonDispatcher = commonDispatcher;

        // monitoring metrics collection task execution timeout
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setNameFormat("metrics-task-timeout-monitor-%d")
                .setDaemon(true)
                .build();
        ScheduledThreadPoolExecutor scheduledExecutor = new ScheduledThreadPoolExecutor(1, threadFactory);
        scheduledExecutor.scheduleWithFixedDelay(this::monitorCollectTaskTimeout, 2, 20, TimeUnit.SECONDS);
    }

    public void putMetrics(String key, MetricsTime value) {
        this.metricsTimeoutMonitorMap.put(key, value);
    }

    public MetricsTime removeMetrics(String key) {
        return this.metricsTimeoutMonitorMap.remove(key);
    }

    private void monitorCollectTaskTimeout() {
        try {
            // Detect whether the collection unit of each metrics has timed out for 4 minutes,
            // and if it times out, it will be discarded and an exception will be returned.
            long deadline = System.currentTimeMillis() - DURATION_TIME;
            for (Map.Entry<String, MetricsTime> entry : metricsTimeoutMonitorMap.entrySet()) {
                MetricsTime metricsTime = entry.getValue();
                if (metricsTime.getStartTime() < deadline) {
                    // Metrics collection timeout
                    MetricsTime removedMetricsTime = metricsTimeoutMonitorMap.remove(entry.getKey());
                    if (removedMetricsTime == null) {
                        continue;
                    }
                    WheelTimerTask timerJob = (WheelTimerTask) metricsTime.getTimeout().task();
                    Job job = timerJob.getJob();
                    // timeout metrics
                    if (metricsCollector != null) {
                        long duration = System.currentTimeMillis() - removedMetricsTime.getStartTime();
                        metricsCollector.recordCollectMetrics(job, duration, "timeout");
                    }

                    CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                            .setId(job.getMonitorId())
                            .setTenantId(job.getTenantId())
                            .setApp(job.getApp())
                            .setMetrics(metricsTime.getMetrics().getName())
                            .setPriority(metricsTime.getMetrics().getPriority())
                            .setTime(System.currentTimeMillis())
                            .setCode(CollectRep.Code.TIMEOUT)
                            .setMsg("collect timeout")
                            .build();
                    log.error("[Collect Timeout]: \n{}", metricsData);
                    if (metricsData.getPriority() == CommonConstants.AVAILABLE_METRICS) {
                        //todo 使用chain bootstrap
//                        commonDispatcher.dispatchCollectData(metricsTime.timeout, metricsTime.getMetrics(), metricsData);
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Task Timeout Monitor]-{}.", e.getMessage(), e);
        }
    }

    /**
     * Metrics times.
     */
    @Data
    @AllArgsConstructor
    public static class MetricsTime {
        private long startTime;
        private Metrics metrics;
        private Timeout timeout;
    }
}
