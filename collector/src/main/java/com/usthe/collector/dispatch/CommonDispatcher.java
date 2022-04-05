package com.usthe.collector.dispatch;

import com.usthe.collector.dispatch.export.MetricsDataExporter;
import com.usthe.collector.dispatch.timer.Timeout;
import com.usthe.collector.dispatch.timer.TimerDispatch;
import com.usthe.collector.dispatch.timer.WheelTimerTask;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.message.CollectRep;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 指标组采集任务与响应数据调度器
 * @author tomsun28
 * @date 2021/11/2 11:24
 */
@Component
@Slf4j
public class CommonDispatcher implements MetricsTaskDispatch, CollectDataDispatch {

    /**
     * 指标组采集任务超时时间值
     */
    private static final long DURATION_TIME = 240_000L;
    /**
     * 指标组采集任务优先级队列
     */
    private MetricsCollectorQueue jobRequestQueue;
    /**
     * 时间轮任务调度器
     */
    private TimerDispatch timerDispatch;
    /**
     * kafka采集数据导出器
     */
    private MetricsDataExporter kafkaDataExporter;
    /**
     * 指标组任务与开始时间映射map
     */
    private Map<String, MetricsTime> metricsTimeoutMonitorMap;

    public CommonDispatcher(MetricsCollectorQueue jobRequestQueue, TimerDispatch timerDispatch,
                            MetricsDataExporter kafkaDataExporter, WorkerPool workerPool) {
        this.kafkaDataExporter = kafkaDataExporter;
        this.jobRequestQueue = jobRequestQueue;
        this.timerDispatch = timerDispatch;
        ThreadPoolExecutor poolExecutor = new ThreadPoolExecutor(2, 2, 1,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(), r -> {
            Thread thread = new Thread(r);
            thread.setDaemon(true);
            return thread;
        });
        // 从任务队列拉取指标组采集任务放入线程池执行
        poolExecutor.execute(() -> {
            Thread.currentThread().setName("metrics-task-dispatcher");
            while (!Thread.currentThread().isInterrupted()) {
                MetricsCollect metricsCollect = null;
                try {
                    metricsCollect =  jobRequestQueue.getJob();
                    if (metricsCollect != null) {
                        workerPool.executeJob(metricsCollect);
                    }
                } catch (RejectedExecutionException rejected) {
                    log.info("[Dispatcher]-the worker pool is full, reject this metrics task, " +
                            "sleep and put in queue again.");
                    try {
                        Thread.sleep(1000);
                        if (metricsCollect != null) {
                            // 在队列里的优先级增大
                            metricsCollect.setRunPriority((byte) (metricsCollect.getRunPriority() + 1));
                            jobRequestQueue.addJob(metricsCollect);
                        }
                    } catch (InterruptedException interruptedException){}
                } catch (Exception e) {
                    log.error("[Dispatcher]-{}.", e.getMessage(), e);
                }
            }
        });
        // 监控指标组采集任务执行时间
        metricsTimeoutMonitorMap = new ConcurrentHashMap<>(128);
        poolExecutor.execute(() -> {
            Thread.currentThread().setName("metrics-task-monitor");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    // 检测每个指标组采集单元是否超时4分钟,超时则丢弃并返回异常
                    long deadline = System.currentTimeMillis() - DURATION_TIME;
                    for (Map.Entry<String, MetricsTime> entry : metricsTimeoutMonitorMap.entrySet()) {
                        MetricsTime metricsTime = entry.getValue();
                        if (metricsTime.getStartTime() < deadline) {
                            // 指标组采集超时
                            WheelTimerTask timerJob = (WheelTimerTask) metricsTime.getTimeout().task();
                            CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                                    .setId(timerJob.getJob().getMonitorId())
                                    .setApp(timerJob.getJob().getApp())
                                    .setMetrics(metricsTime.getMetrics().getName())
                                    .setPriority(metricsTime.getMetrics().getPriority())
                                    .setTime(System.currentTimeMillis())
                                    .setCode(CollectRep.Code.TIMEOUT).setMsg("collect timeout").build();
                            log.error("[Collect Timeout]: \n{}", metricsData);
                            if (metricsData.getPriority() == 0) {
                                dispatchCollectData(metricsTime.timeout, metricsTime.getMetrics(), metricsData);
                            }
                            metricsTimeoutMonitorMap.remove(entry.getKey());
                        }
                    }
                    Thread.sleep(20000);
                } catch (Exception e){
                    log.error("[Monitor]-{}.", e.getMessage(), e);
                }
            }
        });
    }

    @Override
    public void dispatchMetricsTask(Timeout timeout) {
        // 将单个应用的采集任务根据其下的指标组拆分为对应的指标组采集任务 AbstractCollect
        // 将每个指标组放入线程池进行调度
        WheelTimerTask timerTask = (WheelTimerTask) timeout.task();
        Job job = timerTask.getJob();
        job.constructPriorMetrics();
        Set<Metrics> metricsSet = job.getNextCollectMetrics(null, true);
        metricsSet.forEach(metrics -> {
            MetricsCollect metricsCollect = new MetricsCollect(metrics, timeout, this);
            jobRequestQueue.addJob(metricsCollect);
            metricsTimeoutMonitorMap.put(job.getId() + "-" + metrics.getName(),
                    new MetricsTime(System.currentTimeMillis(), metrics, timeout));
        });
    }

    @Override
    public void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData) {
        WheelTimerTask timerJob = (WheelTimerTask) timeout.task();
        Job job = timerJob.getJob();
        metricsTimeoutMonitorMap.remove(job.getId() + "-" + metrics.getName());
        Set<Metrics> metricsSet = job.getNextCollectMetrics(metrics, false);
        if (job.isCyclic()) {
            // 若是异步的周期性循环任务,直接发送指标组的采集数据到消息中间件
            kafkaDataExporter.send(metricsData);
            // 若metricsSet为null表示执行完成
            // 或判断采集指标组是否优先级为0，即为可用性采集指标组 若可用性采集失败 则取消后面的指标组调度直接进入下一轮调度
            if (metricsSet == null
                    || (metrics.getPriority() == (byte)0 && metricsData.getCode() != CollectRep.Code.SUCCESS)) {
                // 此Job所有指标组采集执行完成
                // 周期性任务再次将任务push到时间轮
                // 先判断此次任务执行时间与任务采集间隔时间
                if (timeout.isCancelled()) {
                    return;
                }
                long spendTime = System.currentTimeMillis() - job.getDispatchTime();
                long interval = job.getInterval() - spendTime / 1000;
                interval = interval <= 0 ? 0 : interval;
                // 重置构造执行指标组视图
                job.constructPriorMetrics();
                timerDispatch.cyclicJob(timerJob, interval, TimeUnit.SECONDS);
            } else if (!metricsSet.isEmpty()) {
                // 当前级别指标组执行完成，开始执行下一级别的指标组
                metricsSet.forEach(metricItem -> {
                    MetricsCollect metricsCollect = new MetricsCollect(metricItem, timeout, this);
                    jobRequestQueue.addJob(metricsCollect);
                    metricsTimeoutMonitorMap.put(job.getId() + "-" + metricItem.getName(),
                            new MetricsTime(System.currentTimeMillis(), metricItem, timeout));
                });
            } else {
                // 当前执行级别的指标组列表未全执行完成,
                // 需等待其它同级别指标组执行完成后进入下一级别执行
            }
        } else {
            // 若是临时性一次任务,需等待所有指标组的采集数据统一包装返回
            // 将当前指标组数据插入job里统一组装
            job.addCollectMetricsData(metricsData);
            if (metricsSet == null) {
                // 此Job所有指标组采集执行完成
                // 将所有指标组数据组合一起通知结果监听器
                timerDispatch.responseSyncJobData(job.getId(), job.getResponseDataTemp());
            } else if (!metricsSet.isEmpty()) {
                // 当前级别指标组执行完成，开始执行下一级别的指标组
                metricsSet.forEach(metricItem -> {
                    MetricsCollect metricsCollect = new MetricsCollect(metricItem, timeout, this);
                    jobRequestQueue.addJob(metricsCollect);
                    metricsTimeoutMonitorMap.put(job.getId() + "-" + metricItem.getName(),
                            new MetricsTime(System.currentTimeMillis(), metricItem, timeout));
                });
            } else {
                // 当前执行级别的指标组列表未全执行完成,
                // 需等待其它同级别指标组执行完成后进入下一级别执行
            }
        }
    }

    @Data
    @AllArgsConstructor
    private static class MetricsTime {
        private long startTime;
        private Metrics metrics;
        private Timeout timeout;
    }
}
