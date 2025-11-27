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

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;

/**
 * common task worker thread pool with Virtual Threads
 */
@Component
@Slf4j
public class CommonThreadPool implements DisposableBean {

    private ExecutorService workerExecutor;

    public CommonThreadPool() {
        initWorkExecutor();
    }

    private void initWorkExecutor() {
        ThreadFactory factory = Thread.ofVirtual()
                .name("common-worker-", 0)
                .factory();

        workerExecutor = Executors.newThreadPerTaskExecutor(factory);

        log.info("CommonThreadPool initialized with Virtual Threads.");
    }

    /**
     * Run the task thread
     * @param runnable Task
     */
    public void execute(Runnable runnable) {
        workerExecutor.execute(runnable);
    }

    @Override
    public void destroy() throws Exception {
        if (workerExecutor != null) {
            workerExecutor.close();
        }
    }
}