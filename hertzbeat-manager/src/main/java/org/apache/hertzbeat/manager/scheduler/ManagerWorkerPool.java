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

package org.apache.hertzbeat.manager.scheduler;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
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
 * manager module thread pool
 */
@Slf4j
@Component
public class ManagerWorkerPool implements DisposableBean {
    private final ManagedExecutor workerExecutor;

    private final ManagedExecutor longRunningExecutor;

    public ManagerWorkerPool() {
        this(VirtualThreadProperties.defaults());
    }

    @Autowired
    public ManagerWorkerPool(VirtualThreadProperties virtualThreadProperties) {
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        this.workerExecutor = createWorkerExecutor(properties);
        this.longRunningExecutor = createLongRunningExecutor(properties, workerExecutor);
    }

    private ManagedExecutor createWorkerExecutor(VirtualThreadProperties properties) {
        Thread.UncaughtExceptionHandler handler = (thread, throwable) -> {
            log.error("workerExecutor has uncaughtException.");
            log.error(throwable.getMessage(), throwable);
        };
        if (properties.isEnabled()) {
            VirtualThreadProperties.PoolProperties poolProperties = properties.getManager();
            return ManagedExecutors.newVirtualExecutor("manager-worker", "manager-worker-",
                    poolProperties.getMode(), poolProperties.getMaxConcurrentJobs(), handler);
        }
        return ManagedExecutors.wrap("manager-worker", createLegacyExecutor(handler));
    }

    private ManagedExecutor createLongRunningExecutor(VirtualThreadProperties properties, ManagedExecutor fallback) {
        if (!properties.isEnabled()) {
            return fallback;
        }
        return ManagedExecutors.newPlatformExecutor("manager-long-running", "manager-long-running-",
                (thread, throwable) -> {
                    log.error("manager longRunningExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                });
    }

    private ExecutorService createLegacyExecutor(Thread.UncaughtExceptionHandler handler) {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler(handler)
                .setDaemon(true)
                .setNameFormat("manager-worker-%d")
                .build();
        return new ThreadPoolExecutor(6,
                10,
                10,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    public void executeJob(Runnable runnable) throws RejectedExecutionException {
        workerExecutor.execute(runnable);
    }

    /**
     * Run a long-lived task outside of the short-task execution lane.
     *
     * @param runnable task
     */
    public void executeLongRunning(Runnable runnable) {
        longRunningExecutor.execute(runnable);
    }

    @Override
    public void destroy() throws Exception {
        workerExecutor.close();
        if (longRunningExecutor != workerExecutor) {
            longRunningExecutor.close();
        }
    }
}
