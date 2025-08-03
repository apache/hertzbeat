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

package org.apache.hertzbeat.alert.calculate.realtime;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Calculate alarms based on the alarm definition rules and log data
 */
@Component
@Slf4j
public class LogRealTimeAlertCalculator extends AbstractRealTimeAlertCalculator<LogEntry> {

    public static final String LOG_PREFIX = "log";

    @Autowired
    public LogRealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                      AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                      AlarmCommonReduce alarmCommonReduce, AlarmCacheManager alarmCacheManager,
                                      JexlExprCalculator jexlExprCalculator) {
        super(workerPool, dataQueue, alertDefineService, singleAlertDao, alarmCommonReduce, alarmCacheManager, jexlExprCalculator);
    }

    /**
     * Constructor for LogRealTimeAlertCalculator with a toggle to control whether to start alert calculation threads.
     *
     * @param workerPool          The worker pool used for concurrent alert calculation.
     * @param dataQueue           The queue from which log data is pulled and pushed.
     * @param alertDefineService  The service providing alert definition rules.
     * @param singleAlertDao      The DAO for fetching persisted alert states from storage.
     * @param alarmCommonReduce   The component responsible for reducing and sending alerts.
     * @param alarmCacheManager   The cache manager for managing alert states.
     * @param start               If true, the alert calculation threads will start automatically;
     *                            set to false to disable thread start (useful for unit testing).
     */
    public LogRealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                      AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                      AlarmCommonReduce alarmCommonReduce, AlarmCacheManager alarmCacheManager,
                                      JexlExprCalculator jexlExprCalculator, boolean start) {
        super(workerPool, dataQueue, alertDefineService, singleAlertDao, alarmCommonReduce, alarmCacheManager, jexlExprCalculator, start);
    }

    @Override
    protected LogEntry pollData() throws InterruptedException {
        return dataQueue.pollLogEntry();
    }

    @Override
    protected void processDataAfterCalculation(LogEntry logEntry) {
        dataQueue.sendLogEntryToStorage(logEntry);
    }

    @Override
    protected void calculate(LogEntry logEntry) {
        long currentTimeMilli = System.currentTimeMillis();
        List<AlertDefine> thresholds = this.alertDefineService.getLogRealTimeAlertDefines();

        Map<String, Object> commonContext = new HashMap<>(8);
        commonContext.put(LOG_PREFIX, logEntry);

        for (AlertDefine define : thresholds) {
            if (define.getLabels() == null) {
                define.setLabels(new HashMap<>(8));
            }
            if (define.getAnnotations() == null) {
                define.setAnnotations(new HashMap<>(8));
            }
            final String expr = define.getExpr();
            if (StringUtils.isBlank(expr)) {
                continue;
            }
            Map<String, String> commonFingerPrints = new HashMap<>(8);
            // here use the alert name as finger, not care the alert name may be changed
            // todo add more fingerprints
            commonFingerPrints.put(CommonConstants.LABEL_ALERT_NAME, define.getName());
            commonFingerPrints.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(define.getId()));
            commonFingerPrints.putAll(define.getLabels());

            try {
                boolean match = jexlExprCalculator.execAlertExpression(commonContext, expr, false);
                try {
                    if (match) {
                        afterThresholdRuleMatch(define.getId(), currentTimeMilli, commonFingerPrints, commonContext, define, null);
                    }
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            } catch (Exception ignored) {}
        }
    }
}
