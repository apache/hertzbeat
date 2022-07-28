package com.usthe.collector.dispatch;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * queue of jobs to run
 * 待运行的job队列
 *
 * @author tomsun28
 * @date 2021/10/10 20:20
 */
@Component
@Slf4j
public class MetricsCollectorQueue {

    private final PriorityBlockingQueue<MetricsCollect> jobQueue;

    public MetricsCollectorQueue() {
        jobQueue = new PriorityBlockingQueue<>(2000);
    }

    public void addJob(MetricsCollect job) {
        jobQueue.offer(job);
    }

    public MetricsCollect getJob() throws InterruptedException {
        return jobQueue.poll(2, TimeUnit.SECONDS);
    }

}
