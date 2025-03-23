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

package org.apache.hertzbeat.alert.calculate;

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_THRESHOLD_TYPE_PERIODIC;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;

/**
 * Periodic Alert Rule Scheduler
 */
@Slf4j
@Component
public class PeriodicAlertRuleScheduler implements CommandLineRunner {

    private final PeriodicAlertCalculator calculator;
    private final AlertDefineDao alertDefineDao;
    private final ScheduledExecutorService scheduledExecutor;
    private final Map<Long, ScheduledFuture<?>> scheduledFutures;

    public PeriodicAlertRuleScheduler(PeriodicAlertCalculator calculator, AlertDefineDao alertDefineDao) {
        this.calculator = calculator;
        this.alertDefineDao = alertDefineDao;
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setUncaughtExceptionHandler((thread, throwable) -> {
                    log.error("Scheduled periodic alert threshold has uncaughtException.");
                    log.error(throwable.getMessage(), throwable);
                })
                .setDaemon(true)
                .setNameFormat("periodic-alert-threshold-worker-%d")
                .build();
        this.scheduledExecutor = Executors.newScheduledThreadPool(10, threadFactory);
        this.scheduledFutures = new ConcurrentHashMap<>();
    }

    public void cancelSchedule(Long ruleId) {
        if (ruleId == null) {
            return;
        }
        ScheduledFuture<?> future = scheduledFutures.get(ruleId);
        if (future != null) {
            future.cancel(true);
            scheduledFutures.remove(ruleId);
        }
    }

    public void updateSchedule(AlertDefine rule) {
        if (rule == null || rule.getId() == null) {
            log.error("Alert rule is null or rule id is null.");
            return;
        }
        cancelSchedule(rule.getId());
        if (rule.getType().equals(ALERT_THRESHOLD_TYPE_PERIODIC)) {
            ScheduledFuture<?> future = scheduledExecutor.scheduleAtFixedRate(() -> {
                calculator.calculate(rule);
            }, 0, rule.getPeriod(), java.util.concurrent.TimeUnit.SECONDS);
            scheduledFutures.put(rule.getId(), future);
        }
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting periodic alert rule scheduler...");
        List<AlertDefine> periodicRules = alertDefineDao.findAlertDefinesByTypeAndEnableTrue(ALERT_THRESHOLD_TYPE_PERIODIC);
        for (AlertDefine rule : periodicRules) {
            updateSchedule(rule);
        }
    }
}
