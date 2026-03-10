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

package org.apache.hertzbeat.common.support;

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
 * common task worker thread pool
 */
@Component
@Slf4j
public class CommonThreadPool implements DisposableBean {

    private final ManagedExecutor workerExecutor;

    private final ManagedExecutor longRunningExecutor;

    public CommonThreadPool() {
        this(VirtualThreadProperties.defaults());
    }

    @Autowired
    public CommonThreadPool(VirtualThreadProperties virtualThreadProperties) {
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        this.workerExecutor = createWorkerExecutor(properties);
        this.longRunningExecutor = createLongRunningExecutor(properties, workerExecutor);
    }

    private ManagedExecutor createWorkerExecutor(VirtualThreadProperties properties) {
        Thread.UncaughtExceptionHandler handler = (thread, throwable) -> {
            log.error("common executor has uncaughtException.");
            log.error(throwable.getMessage(), throwable);
        };
        if (properties.isEnabled()) {
            VirtualThreadProperties.PoolProperties poolProperties = properties.getCommon();
            return ManagedExecutors.newVirtualExecutor("common-worker", "common-worker-",
                    poolProperties.getMode(), poolProperties.getMaxConcurrentJobs(), handler);
        }
        return ManagedExecutors.wrap("common-worker", createLegacyExecutor(handler));
    }

    private ManagedExecutor createLongRunningExecutor(VirtualThreadProperties properties, ManagedExecutor fallback) {
        if (!properties.isEnabled()) {
            return fallback;
        }
        return ManagedExecutors.newPlatformExecutor("common-long-running", "common-long-running-",
                (thread, throwable) -> {
                    log.error("common longRunningExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                });
    }

    private ExecutorService createLegacyExecutor(Thread.UncaughtExceptionHandler handler) {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler(handler)
                .setDaemon(true)
                .setNameFormat("common-worker-%d")
                .build();
        return new ThreadPoolExecutor(1,
                Integer.MAX_VALUE,
                10,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    /**
     * Run the task thread
     * @param runnable Task    
     * @throws RejectedExecutionException when thread pool full    
     */
    public void execute(Runnable runnable) throws RejectedExecutionException {
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
