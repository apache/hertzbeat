package com.usthe.warehouse;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * warehouse 工作线程池
 * @author tom
 * @date 2021/11/24 18:09
 */
@Component
@Slf4j
public class WarehouseWorkerPool {

    private ThreadPoolExecutor workerExecutor;

    public WarehouseWorkerPool() {
        initWorkExecutor();
    }

    private void initWorkExecutor() {
        // 线程工厂
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("workerExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable); })
                .setDaemon(true)
                .setNameFormat("warehouse-worker-%d")
                .build();
        workerExecutor = new ThreadPoolExecutor(6,
                10,
                10,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    /**
     * 运行warehouse任务
     * @param runnable 任务
     * @throws RejectedExecutionException when 线程池满
     */
    public void executeJob(Runnable runnable) throws RejectedExecutionException {
        workerExecutor.execute(runnable);
    }
}
