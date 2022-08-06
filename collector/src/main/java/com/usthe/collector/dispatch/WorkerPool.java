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

package com.usthe.collector.dispatch;

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
 * 采集任务工作线程池
 *
 * @author tomsun28
 * @date 2021/10/15 0:01
 */
@Component
@Slf4j
public class WorkerPool implements DisposableBean {

    private ThreadPoolExecutor workerExecutor;

    public WorkerPool() {
        initWorkExecutor();
    }

    private void initWorkExecutor() {
        // thread factory       线程工厂
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("workerExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("collect-worker-%d")
                .build();
        workerExecutor = new ThreadPoolExecutor(100,
                800,
                10,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }

    /**
     * Run the collection task thread
     * 运行采集任务线程
     *
     * @param runnable Task     任务
     * @throws RejectedExecutionException when thread pool full     线程池满
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
