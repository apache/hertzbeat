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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.concurrent.ManagedExecutor;
import org.apache.hertzbeat.common.concurrent.ManagedExecutors;
import org.apache.hertzbeat.common.config.VirtualThreadProperties;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * common reduce alarm worker
 */
@Service
@Slf4j
public class AlarmCommonReduce implements DisposableBean {
    
    private final AlarmGroupReduce alarmGroupReduce;

    private final ManagedExecutor workerExecutor;

    public AlarmCommonReduce(AlarmGroupReduce alarmGroupReduce) {
        this(alarmGroupReduce, VirtualThreadProperties.defaults());
    }

    @Autowired
    public AlarmCommonReduce(AlarmGroupReduce alarmGroupReduce, VirtualThreadProperties virtualThreadProperties) {
        this.alarmGroupReduce = alarmGroupReduce;
        VirtualThreadProperties properties =
                virtualThreadProperties == null ? VirtualThreadProperties.defaults() : virtualThreadProperties;
        this.workerExecutor = initWorkExecutor(properties);
    }

    private ManagedExecutor initWorkExecutor(VirtualThreadProperties properties) {
        Thread.UncaughtExceptionHandler handler = (thread, throwable) -> {
            log.error("alerter-reduce-worker has uncaughtException.");
            log.error(throwable.getMessage(), throwable);
        };
        if (properties.enabled()) {
            VirtualThreadProperties.QueueProperties queueProperties = properties.alerter().reduce();
            return ManagedExecutors.newQueuedVirtualExecutor("alerter-reduce-worker", "alerter-reduce-worker-",
                    queueProperties.maxConcurrentJobs(), queueProperties.queueCapacity(), handler);
        }
        return ManagedExecutors.wrap("alerter-reduce-worker", new java.util.concurrent.ThreadPoolExecutor(2,
                2,
                10,
                java.util.concurrent.TimeUnit.SECONDS,
                new java.util.concurrent.LinkedBlockingQueue<>(),
                new ThreadFactoryBuilder()
                        .setUncaughtExceptionHandler(handler)
                        .setDaemon(true)
                        .setNameFormat("alerter-reduce-worker-%d")
                        .build(),
                new java.util.concurrent.ThreadPoolExecutor.AbortPolicy()));
    }


    public void reduceAndSendAlarm(SingleAlert alert) {
        workerExecutor.execute(reduceAlarmTask(alert));
    }

    public void reduceAndSendAlarmGroup(Map<String, String> groupLabels, List<SingleAlert> alerts) {
        workerExecutor.execute(() -> {
            try {
                // Generate alert fingerprint
                for (SingleAlert alert : alerts) {
                    String fingerprint = generateAlertFingerprint(alert.getLabels());
                    alert.setFingerprint(fingerprint);
                }
                // Process the group alert
                alarmGroupReduce.processGroupAlert(groupLabels, alerts);
            } catch (Exception e) {
                log.error("Reduce alarm group failed: {}", e.getMessage());
            }
        });
    }
    
    Runnable reduceAlarmTask(SingleAlert alert) {
        return () -> {
            try {
                // Generate alert fingerprint
                String fingerprint = generateAlertFingerprint(alert.getLabels());
                alert.setFingerprint(fingerprint);
                alarmGroupReduce.processGroupAlert(alert);
            } catch (Exception e) {
                log.error("Reduce alarm failed: {}", e.getMessage());
            }
        };
    }

    /**
     * Generate fingerprint for alert to identify duplicates
     * Fingerprint is based on labels excluding timestamp related fields
     */
    private String generateAlertFingerprint(Map<String, String> labels) {
        return labels.entrySet().stream()
                .filter(e -> !"timestamp".equals(e.getKey())
                        && !"starts_at".equals(e.getKey()) && !"actives_at".equals(e.getKey())
                        && !"end_at".equals(e.getKey()) && !"ends_at".equals(e.getKey())
                        && !"start_at".equals(e.getKey()) && !"active_at".equals(e.getKey()))
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + ":" + e.getValue())
                .collect(Collectors.joining(","));
    }

    @Override
    public void destroy() {
        workerExecutor.close();
    }
}
