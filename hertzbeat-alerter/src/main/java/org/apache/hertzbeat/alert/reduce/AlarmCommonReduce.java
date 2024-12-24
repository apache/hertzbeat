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

package org.apache.hertzbeat.alert.reduce;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.stereotype.Service;

/**
 * common reduce alarm worker
 */
@Service
@Slf4j
public class AlarmCommonReduce {
    
    private final AlarmGroupReduce alarmGroupReduce;
    
    private ThreadPoolExecutor workerExecutor;

    public AlarmCommonReduce(AlarmGroupReduce alarmGroupReduce) {
        initWorkExecutor();
        this.alarmGroupReduce = alarmGroupReduce;
    }

    private void initWorkExecutor() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("alerter-reduce-worker has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("alerter-reduce-worker-%d")
                .build();
        workerExecutor = new ThreadPoolExecutor(2,
                2,
                10,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(),
                threadFactory,
                new ThreadPoolExecutor.AbortPolicy());
    }


    public void reduceAndSendAlarm(SingleAlert alert) {
        workerExecutor.execute(reduceAlarmTask(alert));
    }
    
    Runnable reduceAlarmTask(SingleAlert alert) {
        return () -> {
            try {
                alarmGroupReduce.processGroupAlert(alert);
            } catch (Exception e) {
                log.error("Reduce alarm failed: {}", e.getMessage());
            }
        };
    }
}
