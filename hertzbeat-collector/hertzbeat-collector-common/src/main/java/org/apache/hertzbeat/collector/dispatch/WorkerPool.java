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

package org.apache.hertzbeat.collector.dispatch;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Collection task worker thread pool
 */
@Component
@Slf4j
public class WorkerPool implements DisposableBean {

    private ThreadPoolExecutor workerExecutor;

    public WorkerPool() {
        initWorkExecutor();
    }

    private void initWorkExecutor() {
        // thread factory
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("[Important] WorkerPool workerExecutor has uncaughtException.", throwable);
                    log.error("Thread Name {} : {}", thread.getName(), throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("collect-worker-%d")
                .build();
        int coreSize = Math.max(2, Runtime.getRuntime().availableProcessors());
        int maxSize = Runtime.getRuntime().availableProcessors() * 16;
        workerExecutor = new ThreadPoolExecutor(coreSize,
                maxSize,
                10,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    /**
     * Run the collection task thread
     *
     * @param runnable Task  
     * @throws RejectedExecutionException when thread pool full 
     */
    public void executeJob(Runnable runnable) throws RejectedExecutionException {
        workerExecutor.execute(runnable);
    }

    @Override
    public void destroy() throws Exception {
        if (workerExecutor != null) {
            workerExecutor.shutdownNow();
        }
    }
}
