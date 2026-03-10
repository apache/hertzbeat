/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.concurrent.ManagedExecutor;
import org.apache.hertzbeat.common.concurrent.ManagedExecutors;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * alarm module thread pool
 */
@Component
@Slf4j
public class AlerterWorkerPool implements DisposableBean {

    private ThreadPoolExecutor workerExecutor;
    private ManagedExecutor notifyExecutor;
    private ManagedExecutor logWorkerExecutor;
    private Map<Byte, Semaphore> notifyChannelPermits;
    private int notifyMaxConcurrentPerChannel;

    public AlerterWorkerPool() {
        this(VirtualThreadProperties.defaults());
    }

    @Autowired
    public AlerterWorkerPool(VirtualThreadProperties virtualThreadProperties) {
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        initWorkExecutor();
        initNotifyExecutor(properties);
        initLogWorkerExecutor(properties);
    }

    private void initWorkExecutor() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Alerter workerExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("alerter-worker-%d")
                .build();
        workerExecutor = new ThreadPoolExecutor(10,
                10,
                10,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    private void initNotifyExecutor(VirtualThreadProperties properties) {
        Thread.UncaughtExceptionHandler handler = (thread, throwable) -> {
            log.error("Alerter notifyExecutor has uncaughtException.");
            log.error(throwable.getMessage(), throwable);
        };
        if (properties.isEnabled()) {
            VirtualThreadProperties.AlerterProperties alerterProperties = properties.getAlerter();
            VirtualThreadProperties.PoolProperties notifyProperties = alerterProperties.getNotify();
            notifyMaxConcurrentPerChannel = Math.max(1, alerterProperties.getNotifyMaxConcurrentPerChannel());
            notifyChannelPermits = new ConcurrentHashMap<>(8);
            notifyExecutor = ManagedExecutors.newVirtualExecutor("notify-worker", "notify-worker-",
                    notifyProperties.getMode(), notifyProperties.getMaxConcurrentJobs(), handler);
            return;
        }
        notifyMaxConcurrentPerChannel = 0;
        notifyChannelPermits = null;
        notifyExecutor = ManagedExecutors.wrap("notify-worker", createLegacyNotifyExecutor(handler));
    }

    private ThreadPoolExecutor createLegacyNotifyExecutor(Thread.UncaughtExceptionHandler handler) {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler(handler)
                .setDaemon(true)
                .setNameFormat("notify-worker-%d")
                .build();
        return new ThreadPoolExecutor(6,
                6,
                10,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    private void initLogWorkerExecutor(VirtualThreadProperties properties) {
        Thread.UncaughtExceptionHandler handler = (thread, throwable) -> {
            log.error("Alerter logWorkerExecutor has uncaughtException.");
            log.error(throwable.getMessage(), throwable);
        };
        if (properties.isEnabled()) {
            VirtualThreadProperties.QueueProperties logWorkerProperties = properties.getAlerter().getLogWorker();
            logWorkerExecutor = ManagedExecutors.newQueuedVirtualExecutor("alerter-log-worker", "log-worker-",
                    logWorkerProperties.getMaxConcurrentJobs(), logWorkerProperties.getQueueCapacity(), handler);
            return;
        }
        logWorkerExecutor = ManagedExecutors.wrap("alerter-log-worker", createLegacyLogWorkerExecutor(handler));
    }

    private ThreadPoolExecutor createLegacyLogWorkerExecutor(Thread.UncaughtExceptionHandler handler) {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler(handler)
                .setDaemon(true)
                .setNameFormat("log-worker-%d")
                .build();
        return new ThreadPoolExecutor(10, 10, 10, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(1000),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    /**
     * Run the alerter task
     * @param runnable task
     * @throws RejectedExecutionException when The thread pool is full of
     */
    public void executeJob(Runnable runnable) throws RejectedExecutionException {
        workerExecutor.execute(runnable);
    }

    /**
     * Executes the given runnable task using the notifyExecutor.
     *
     * @param runnable the task to be executed
     * @throws RejectedExecutionException if the task cannot be accepted for execution
     */
    public void executeNotify(Runnable runnable) throws RejectedExecutionException {
        notifyExecutor.execute(runnable);
    }

    /**
     * Executes the given runnable task using the notify executor with per-channel concurrency control.
     *
     * @param channelType notification channel type
     * @param runnable the task to be executed
     * @throws RejectedExecutionException if the task cannot be accepted for execution
     */
    public void executeNotify(byte channelType, Runnable runnable) throws RejectedExecutionException {
        if (notifyChannelPermits == null) {
            notifyExecutor.execute(runnable);
            return;
        }
        Semaphore semaphore = notifyChannelPermits.computeIfAbsent(channelType,
                key -> new Semaphore(notifyMaxConcurrentPerChannel));
        if (!semaphore.tryAcquire()) {
            throw new RejectedExecutionException(
                    "notify-worker rejected task because channel concurrency limit was reached for type " + channelType);
        }
        boolean submitted = false;
        try {
            notifyExecutor.execute(() -> {
                try {
                    runnable.run();
                } finally {
                    semaphore.release();
                }
            });
            submitted = true;
        } finally {
            if (!submitted) {
                semaphore.release();
            }
        }
    }

    /**
     * Executes the given runnable task using the logWorkerExecutor.
     *
     * @param runnable the task to be executed
     * @throws RejectedExecutionException if the task cannot be accepted for execution
     */
    public void executeLogJob(Runnable runnable) throws RejectedExecutionException {
        logWorkerExecutor.execute(runnable);
    }

    @Override
    public void destroy() {
        workerExecutor.shutdownNow();
        notifyExecutor.close();
        logWorkerExecutor.close();
    }
}
