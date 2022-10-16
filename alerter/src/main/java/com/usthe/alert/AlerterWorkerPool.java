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

package com.usthe.alert;

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
public class AlerterWorkerPool {

    private ThreadPoolExecutor workerExecutor;

    public AlerterWorkerPool() {
        initWorkExecutor();
    }

    private void initWorkExecutor() {
        // 线程工厂
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("workerExecutor has uncaughtException.");
                    log.error(throwable.getMessage(), throwable); })
                .setDaemon(true)
                .setNameFormat("alerter-worker-%d")
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
     * Run the alerter task 运行alerter任务
     * @param runnable task 任务
     * @throws RejectedExecutionException when The thread pool is full of 线程池满
     */
    public void executeJob(Runnable runnable) throws RejectedExecutionException {
        workerExecutor.execute(runnable);
    }
}
