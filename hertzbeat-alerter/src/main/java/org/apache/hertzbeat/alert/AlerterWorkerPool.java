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

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;

/**
 * alarm module thread pool with Virtual Threads
 */
@Component
@Slf4j
public class AlerterWorkerPool {

    private ExecutorService workerExecutor;
    private ExecutorService notifyExecutor;
    private ExecutorService logWorkerExecutor;

    public AlerterWorkerPool() {
        initWorkExecutor();
        initNotifyExecutor();
        initLogWorkerExecutor();
    }

    private void initWorkExecutor() {
        ThreadFactory factory = Thread.ofVirtual()
                .name("alerter-worker-", 0)
                .factory();
        workerExecutor = Executors.newThreadPerTaskExecutor(factory);
    }

    private void initNotifyExecutor() {
        ThreadFactory factory = Thread.ofVirtual()
                .name("notify-worker-", 0)
                .factory();
        notifyExecutor = Executors.newThreadPerTaskExecutor(factory);
    }

    private void initLogWorkerExecutor() {
        ThreadFactory factory = Thread.ofVirtual()
                .name("log-worker-", 0)
                .factory();
        logWorkerExecutor = Executors.newThreadPerTaskExecutor(factory);
    }

    /**
     * Run the alerter task
     * @param runnable task
     */
    public void executeJob(Runnable runnable){
        workerExecutor.execute(runnable);
    }

    /**
     * Executes the given runnable task using the notifyExecutor.
     *
     * @param runnable the task to be executed
     */
    public void executeNotify(Runnable runnable){
        notifyExecutor.execute(runnable);
    }

    /**
     * Executes the given runnable task using the logWorkerExecutor.
     *
     * @param runnable the task to be executed
     */
    public void executeLogJob(Runnable runnable){
        logWorkerExecutor.execute(runnable);
    }
}